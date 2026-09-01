# Migrar de PGlite a Postgres real (brew)

> **Estat actual (2026-09-01):** la MVP arrenca amb PGlite (Postgres WASM embegut en Node, zero-config). Tot funciona: 23/23 tests, CRUD verificat end-to-end.
>
> Aquest doc recull els passos per canviar a Postgres real quan es pugui actualitzar el sistema.

## Per què estem amb PGlite ara

A data d'avui la màquina té:

- macOS Sonoma **14.8.7** (build 23J520)
- Xcode **13.4.1** (a `/Applications/Xcode.app`)
- Command Line Tools antigues (compatibles amb Xcode 13)
- Homebrew **6.0.20**

Quan hem intentat `brew install postgresql@16`, brew ha fallat perquè les deps actuals (`icu4c@78`, `openssl@3`, etc.) demanen Xcode ≥ 16.2. Hem provat:

- `softwareupdate --install -a` → no ofereix CLT, només macOS 14.8.9 i Safari
- `brew install postgresql@13` / `@14` → viable però perdem Postgres 16

Hem optat per PGlite per no bloquejar la MVP. El codi suporta tots dos drivers via `DATABASE_URL`.

## Quan reprendre

Un cop **macOS actualitzat a Sonoma 14.8.9** (o superior), `softwareupdate --install -a` ja no ens ofereix res per Xcode, però Xcode es pot actualitzar via App Store o bé es pot tornar a provar `brew install postgresql@16` — les deps noves d'Homebrew poden funcionar amb Sonoma actualitzat.

Si encara falla, el camí net és actualitzar Xcode (App Store → cerca "Xcode" → Update).

## Passos exactes

### 1. Actualitzar macOS Sonoma

```bash
softwareupdate --install -a
# Reiniciar quan ho demani
```

### 2. Intentar brew directament

```bash
brew install postgresql@16
```

Si funciona, salta al pas 4. Si falla amb error de CLT/Xcode, continua.

### 3. (Si cal) Actualitzar CLT i Xcode

```bash
# Esborrar CLT velles
sudo rm -rf /Library/Developer/CommandLineTools

# Tornar a instal·lar CLT (obre un instal·lador GUI, ~700MB)
xcode-select --install

# Si brew encara es queixa de Xcode.app:
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
# o actualitzar Xcode via App Store (~7GB)
```

### 4. Un cop brew funciona

```bash
brew install postgresql@16
brew services start postgresql@16
```

Verifica:

```bash
psql --version
# Esperat: psql (PostgreSQL) 16.x

brew services list
# Esperat: postgresql@16  started
```

### 5. Crear usuari i base de dades

Connecta't com a `postgres` (l'usuari admin que crea brew per defecte):

```bash
psql postgres
```

Dins de `psql`:

```sql
CREATE USER receptari WITH PASSWORD 'receptari';
CREATE DATABASE receptari OWNER receptari;
GRANT ALL PRIVILEGES ON DATABASE receptari TO receptari;
\q
```

Verifica:

```bash
PGPASSWORD=receptari psql -h localhost -U receptari -d receptari -c "SELECT 1;"
# Esperat: 1 fila amb ?column? = 1
```

### 6. Apuntar l'API al Postgres real

Edita `apps/api/.env`:

```diff
- DATABASE_URL=pglite://./data/receptari
+ DATABASE_URL=postgres://receptari:receptari@localhost:5432/receptari
```

(Opcional) Esborra la DB de PGlite vella:

```bash
rm -rf apps/api/data
```

### 7. Aplicar les migracions

```bash
pnpm db:migrate
# Esperat: 🐘 Postgres → postgres://receptari:***@localhost:5432/receptari
#          ✅ Migracions aplicades
```

### 8. Verificar

```bash
pnpm test              # 23/23 (els tests sempre usen PGlite in-memory)
pnpm dev               # arrenca API + web
# Manual:
curl http://localhost:3000/api/health
```

## Notes

- Els tests **continuaran usant PGlite** (és correcte: cada test és independent). El driver només canvia en mode `dev`/`start`.
- Si en algun moment vols Docker, el `docker-compose.yml` ja està preparat — un cop tinguis Docker o Colima, `DATABASE_URL=postgres://receptari:receptari@localhost:5432/receptari` funciona igual.
