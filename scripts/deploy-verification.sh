#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

fail() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }
[[ $# == 3 ]] || fail 'Uso: deploy-verification.sh ARQUIVO SHA256 COMMIT'
archive=$(realpath -e -- "$1")
expected_sha=${2,,}; commit=${3,,}
[[ -f "$archive" && "$expected_sha" =~ ^[0-9a-f]{64}$ && "$commit" =~ ^[0-9a-f]{40}$ ]] || fail 'Arquivo, SHA256 ou commit inválido.'
base=/opt/stacks/calcula-dinheiro
compose="$base/compose.yaml"
[[ -d "$base/releases" && -w "$base/releases" && -w "$base" && -f "$compose" && ! -L "$compose" && -w "$compose" ]] || fail 'Sem permissão para atualizar a pasta e o Compose regular do Calcula Dinheiro.'
for tool in docker python3 flock sha256sum curl; do command -v "$tool" >/dev/null || fail "Comando ausente: $tool"; done
[[ $(sha256sum -- "$archive" | cut -d' ' -f1) == "$expected_sha" ]] || fail 'O SHA256 do pacote recebido não confere.'
exec 9>"$base/.deploy-verification.lock"
flock -n 9 || fail 'Outra implantação do Calcula Dinheiro está em andamento.'
docker info >/dev/null
docker compose version >/dev/null
run_id="$(date -u +%Y%m%dT%H%M%SZ)-${commit:0:12}-$$"
workdir="$base/.deploy-$run_id"
release="$base/releases/$run_id"
builder="calcula-build-$run_id"; probe="calcula-preview-$run_id"
mkdir -- "$workdir"
backup="$workdir/compose-anterior.yaml"; candidate="$base/.compose-$run_id.yaml"
swapped=0; success=0; candidate_sha=''; original_sha=''; previous_id=''; previous_mount=''; image=''; compose_image=''

snapshot_others() {
  docker ps -aq |
    xargs -r docker inspect --type container --format '{"name":{{json .Name}},"id":{{json .Id}},"state":{{json .State}}}' |
    python3 -c 'import json, sys
for line in sys.stdin:
    container = json.loads(line)
    if container["name"] == "/calcula-dinheiro":
        continue
    state = container["state"]
    health = state.get("Health") or {}
    print(container["name"], container["id"], state["Status"], health.get("Status", "sem-healthcheck"))' | sort
}
remove_owned() {
  local name=$1 owner
  owner=$(docker inspect --format '{{index .Config.Labels "calcula-dinheiro.deploy"}}' "$name" 2>/dev/null) || return 0
  [[ "$owner" != "$run_id" ]] || docker rm -f "$name" >/dev/null 2>&1
}
healthy() {
  local deadline=$((SECONDS + 90)) state
  while (( SECONDS < deadline )); do
    state=$(
      docker inspect --type container --format '{{json .State}}' calcula-dinheiro 2>/dev/null |
        python3 -c 'import json, sys
state = json.load(sys.stdin)
print(state["Status"], (state.get("Health") or {}).get("Status", "sem-healthcheck"))' 2>/dev/null
    ) || state=ausente
    [[ "$state" != 'running healthy' ]] || return 0
    [[ "$state" != exited* && "$state" != dead* ]] || return 1
    sleep 2
  done
  return 1
}
finish() {
  local rc=$? current_sha current_info current_id current_mount
  trap - EXIT INT TERM HUP
  set +e
  remove_owned "$probe"; remove_owned "$builder"
  if (( swapped && ! success )); then
    current_sha=$(sha256sum -- "$compose" 2>/dev/null | cut -d' ' -f1)
    current_info=$(docker inspect --format '{{.Id}} {{range .Mounts}}{{if eq .Destination "/app"}}{{.Source}}{{end}}{{end}}' calcula-dinheiro 2>/dev/null)
    read -r current_id current_mount <<< "$current_info"
    if [[ "$current_sha" == "$original_sha" && "$current_id" == "$previous_id" ]]; then
      printf 'A troca não foi efetivada; o Compose e o contêiner anteriores permanecem intactos.\n' >&2
    elif [[ "$current_sha" == "$candidate_sha" && ( -z "$current_id" || "$current_id" == "$previous_id" || "$current_mount" == "$release/dist/standalone" ) ]]; then
      printf 'A validação falhou; restaurando apenas o Calcula Dinheiro.\n' >&2
      cp -p -- "$backup" "$candidate" && mv -f -- "$candidate" "$compose" &&
        { { [[ "$current_id" == "$previous_id" ]] && healthy; } ||
          { [[ $(docker image inspect --format '{{.Id}}' "$compose_image" 2>/dev/null) == "$image" ]] &&
            docker compose --project-directory "$base" -f "$compose" up -d --no-deps --no-build --pull never web && healthy; }; }
      if [[ $? == 0 ]]; then printf 'Compose anterior restaurado; Calcula Dinheiro saudável.\n' >&2
      else printf 'ATENÇÃO: a reversão não concluiu. Backup preservado em %s\n' "$backup" >&2; fi
    else
      printf 'ATENÇÃO: houve alteração concorrente; a reversão automática não sobrescreveu o estado atual. Backup: %s\n' "$backup" >&2
    fi
    rc=1
  fi
  if [[ -f "$workdir/outros-antes.txt" ]] && snapshot_others > "$workdir/outros-depois.txt"; then
    if ! diff -u "$workdir/outros-antes.txt" "$workdir/outros-depois.txt" > "$workdir/diferencas-outros.txt"; then
      printf 'Houve diferenças nos outros contêineres; nenhum deles foi reiniciado por este script:\n' >&2
      cat "$workdir/diferencas-outros.txt" >&2
    fi
  fi
  (( rc == 0 )) || printf 'Implantação não concluída. Diagnóstico preservado em %s\n' "$workdir" >&2
  exit "$rc"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
snapshot_others > "$workdir/outros-antes.txt"
if awk '($3=="running" || $3=="restarting") && ($4=="unhealthy" || $4=="starting") {found=1; print $1, $3, $4} END {exit !found}' "$workdir/outros-antes.txt"; then
  fail 'Há outro serviço com saúde pendente; a construção não foi iniciada.'
fi
docker inspect --format '{"id":{{json .Id}},"image":{{json .Image}},"project":{{json (index .Config.Labels "com.docker.compose.project")}},"service":{{json (index .Config.Labels "com.docker.compose.service")}},"state":{{json .State}},"mounts":{{json .Mounts}}}' calcula-dinheiro > "$workdir/anterior.json"
python3 - "$base" "$workdir/anterior.json" <<'PY'
import json, pathlib, shutil, sys
base = pathlib.Path(sys.argv[1]); c = json.load(open(sys.argv[2]))
assert base.resolve() == base and (base / 'releases').resolve() == base / 'releases', 'Pasta da instalação inesperada'
assert c['project'] == 'calcula-dinheiro' and c['service'] == 'web', 'Projeto ou serviço divergente'
assert c['state']['Running'] and (c['state'].get('Health') or {}).get('Status') == 'healthy', 'Serviço atual não está saudável'
app = [m for m in c['mounts'] if m['Destination'] == '/app']
assert len(app) == 1 and app[0]['Type'] == 'bind' and app[0]['RW'] is False, 'Volume /app inesperado'
assert all(m['Destination'] == '/app' or (m['Type'] == 'tmpfs' and m['Destination'] == '/tmp') for m in c['mounts']), 'Volumes adicionais inesperados'
src = pathlib.Path(app[0]['Source']); rel = src.relative_to(base / 'releases')
assert len(rel.parts) == 3 and rel.parts[1:] == ('dist', 'standalone') and src.resolve() == src, 'Release ativa fora da estrutura esperada'
mem = dict(line.split(':', 1) for line in open('/proc/meminfo'))
assert int(mem['MemAvailable'].split()[0]) * 1024 >= (1536 + 1024) * 1024**2, 'Memória livre insuficiente para construir com margem'
assert shutil.disk_usage(base).free >= 6 * 1024**3, 'É necessário haver pelo menos 6 GiB livres'
print('Instalação, saúde, memória e espaço livre conferidos.')
PY
read -r previous_id image previous_mount < <(python3 -c 'import json,sys; c=json.load(open(sys.argv[1])); print(c["id"],c["image"],next(m["Source"] for m in c["mounts"] if m["Destination"]=="/app"))' "$workdir/anterior.json")
docker image inspect "$image" >/dev/null
original_sha=$(sha256sum -- "$compose" | cut -d' ' -f1)
cp -p -- "$compose" "$backup"
[[ $(sha256sum -- "$backup" | cut -d' ' -f1) == "$original_sha" ]] || fail 'O Compose mudou durante a cópia.'
mkdir -m 755 -- "$release"
python3 - "$archive" "$release" "$commit" <<'PY'
import json, pathlib, shutil, sys, tarfile
archive, dest, commit = sys.argv[1:]; root = pathlib.Path(dest)
with tarfile.open(archive, 'r:*') as tf:
    members = tf.getmembers(); seen = set()
    assert tf.pax_headers.get('comment', '').strip() == commit, 'O commit do git archive não confere'
    for m in members:
        p = pathlib.PurePosixPath(m.name)
        assert not p.is_absolute() and '..' not in p.parts and p.parts, 'Caminho inseguro no pacote'
        assert m.isfile() or m.isdir(), 'Links e arquivos especiais não são aceitos'
        assert str(p) not in seen, 'Caminho duplicado no pacote'
        seen.add(str(p))
    for m in members:
        p = root.joinpath(*pathlib.PurePosixPath(m.name).parts)
        p.parent.mkdir(parents=True, exist_ok=True)
        if m.isdir(): p.mkdir(exist_ok=True); p.chmod(0o755)
        else:
            with tf.extractfile(m) as src, p.open('xb') as out: shutil.copyfileobj(src, out)
            p.chmod(m.mode & 0o777)
c = json.loads((root / 'config/publicacao.json').read_text()); a = c['adsense']
assert c['origem'] == 'https://calculadinheiro.com.br' and c['emailContato'] == 'contato@tickerlab.com.br', 'Domínio ou contato divergente'
assert a['publisherId'] == 'pub-4178012487609221' and a['slotRodape'] == '8432472360', 'Identificadores AdSense divergentes'
assert a['modo'] == 'verificacao' and a['cmpValidada'] is False and a['cmpScriptUrl'] == '', 'A configuração deve permanecer em verificação'
assert (root / 'scripts/check-verification.py').is_file(), 'Validador ausente no pacote'
print('Pacote e configuração conferidos; nova release:', root.name)
PY
printf 'Construindo com até 1.536 MiB de RAM, sem swap adicional e 0,5 CPU.\n'
docker run --rm --init --name "$builder" --label "calcula-dinheiro.deploy=$run_id" --pull never \
  --memory 1536m --memory-swap 1536m --cpus 0.5 --user "$(id -u):$(id -g)" \
  -e npm_config_cache=/tmp/npm-cache -e NODE_OPTIONS=--max-old-space-size=1152 \
  --mount "type=bind,src=$release,dst=/app" -w /app "$image" \
  sh -c 'set -eu; npm ci --no-audit --no-fund; npm test; npx --no-install tsc --noEmit; npm run build' 2>&1 | tee -a "$workdir/build.log"
[[ -f "$release/dist/standalone/server.js" ]] || fail 'O build não gerou dist/standalone/server.js.'
docker run -d --rm --init --name "$probe" --label "calcula-dinheiro.deploy=$run_id" --pull never \
  --read-only --cap-drop ALL --security-opt no-new-privileges:true --memory 512m --memory-swap 512m --cpus 0.5 --pids-limit 100 \
  --user 1000:1000 --tmpfs /tmp:size=32m,mode=1777 -e NODE_ENV=production -e HOST=0.0.0.0 -e PORT=3000 \
  -e NODE_OPTIONS=--max-old-space-size=384 -p 127.0.0.1::3000 \
  --mount "type=bind,src=$release/dist/standalone,dst=/app,readonly" -w /app "$image" node server.js >/dev/null
port=$(docker port "$probe" 3000/tcp | sed -n 's/^127\.0\.0\.1://p')
[[ "$port" =~ ^[0-9]+$ ]] || fail 'Não foi possível identificar a porta local da prévia.'
ready=0
for ((attempt=0; attempt<30; attempt++)); do
  if curl --silent --fail --max-time 2 "http://127.0.0.1:$port/robots.txt" >/dev/null; then ready=1; break; fi
  sleep 1
done
(( ready )) || fail 'A prévia não iniciou no prazo esperado.'
python3 "$release/scripts/check-verification.py" "http://127.0.0.1:$port"
remove_owned "$probe"
cp -p -- "$backup" "$candidate"
python3 - "$candidate" "$previous_mount" "$base" "$run_id" <<'PY'
import pathlib, re, sys
p = pathlib.Path(sys.argv[1]); old, base, ident = sys.argv[2:]; raw = p.read_bytes()
pattern = rb'(?m)^([ \t]+-[ \t]+)(\./releases/[A-Za-z0-9._-]+/dist/standalone:/app:ro)([ \t]*\r?)$'
matches = list(re.finditer(pattern, raw)); assert len(matches) == 1, 'Formato do volume no Compose inesperado'
m = matches[0]; source = m.group(2).decode().split(':', 1)[0]
assert str(pathlib.Path(base, source)) == old, 'O volume do Compose diverge do contêiner ativo'
new = ('./releases/' + ident + '/dist/standalone:/app:ro').encode()
p.write_bytes(raw[:m.start(2)] + new + raw[m.end(2):])
PY
docker compose --project-directory "$base" -f "$candidate" config --quiet
compose_image=$(docker compose --project-directory "$base" -f "$candidate" config --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["services"]["web"]["image"])')
[[ $(docker image inspect --format '{{.Id}}' "$compose_image") == "$image" ]] || fail 'A imagem indicada pelo Compose mudou; nenhuma troca foi feita.'
candidate_sha=$(sha256sum -- "$candidate" | cut -d' ' -f1)
[[ $(sha256sum -- "$compose" | cut -d' ' -f1) == "$original_sha" ]] || fail 'O Compose foi alterado durante o build; nenhuma troca foi feita.'
[[ $(docker inspect --format '{{.Id}}' calcula-dinheiro) == "$previous_id" ]] || fail 'O contêiner ativo mudou durante o build; nenhuma troca foi feita.'
swapped=1
mv -f -- "$candidate" "$compose"
[[ $(docker image inspect --format '{{.Id}}' "$compose_image") == "$image" ]] || fail 'A imagem do Compose mudou antes da atualização.'
docker compose --project-directory "$base" -f "$compose" up -d --no-deps --no-build --pull never web
healthy || fail 'O serviço atualizado não ficou saudável em 90 segundos.'
[[ $(docker inspect --format '{{.Image}}' calcula-dinheiro) == "$image" ]] || fail 'A imagem do serviço atualizado diverge da imagem validada.'
python3 "$release/scripts/check-verification.py" 'http://127.0.0.1:8082'
[[ $(sha256sum -- "$compose" | cut -d' ' -f1) == "$candidate_sha" ]] || fail 'O Compose mudou durante a validação final.'
python3 - "$release" "$commit" "$expected_sha" "$image" "$backup" <<'PY'
import datetime, json, pathlib, sys
release, commit, archive_sha, image, backup = sys.argv[1:]
receipt = dict(commit=commit, archive_sha256=archive_sha, image=image, modo='verificacao',
               concluido_em=datetime.datetime.now(datetime.timezone.utc).isoformat(), backup_compose=backup)
pathlib.Path(release, 'implantacao.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
PY
success=1
printf 'Implantação concluída em modo de verificação. Anúncios continuam desligados.\nCommit: %s\nRelease: %s\nBackup do Compose: %s\n' "$commit" "$release" "$backup"
