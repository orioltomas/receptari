# Migrar de PGlite a Postgres real (brew)

> **Estat actual (2026-09-01):** la MVP arrenca amb PGlite (Postgres WASM embegut en Node, zero-config). Tot funciona: 23/23 tests, CRUD verificat end-to-end. **Decidim quedar-nos amb PGlite** per no bloquejar la MVP esperant l'actualització d'Xcode.
>
> Aquest doc recull els passos per canviar a Postgres real quan es pugui actualitzar Xcode.

## Per què estem amb PGlite ara

La màquina té:

- macOS Sonoma **14.8.9** (build 23J631) ✅
- Xcode **13.4.1** (a `/Applications/Xcode.app`) ❌
- Command Line Tools **11.4** (de 2020) ❌
- Homebrew **6.0.20**

Quan hem intentat `brew install postgresql@16`, brew ha fallat perquè la dep `openssl@3` (3.6.4) demana **Xcode ≥ 16.2** o **CLT ≥ 16.2**. Hem provat totes les versions alternatives i el bloqueig és comú:

- `brew install postgresql@12` / `@14` / `@15` / `@16` / `@17` / `@18` → totes fallen pel mateix error (dep `openssl@3` o `krb5`)
- `brew install postgresql@13` → "disabled because it is not supported upstream"
- `softwareupdate --install -a` → "No updates are available" (ja estem a 14.8.9)

L'error exacte que dóna brew:

```
Error: Your Xcode (13.4.1) at /Applications/Xcode.app is too outdated.
Please update to Xcode 16.2 (or delete it).
Error: Your Command Line Tools are too outdated.
Update them from Software Update in System Settings.
```

Hem optat per PGlite per no bloquejar la MVP. El codi suporta tots dos drivers via `DATABASE_URL` (veure README).

## Quan reprendre

Per desbloquejar brew cal **Xcode 16.2 o CLT 16.2**. CLT 16.2 requereix macOS 15 (Sequoia) o superior, per tant des de Sonoma 14.8.9 el camí net és un d'aquests:

1. **Actualitzar Xcode via App Store** (~7GB, GUI): "Xcode" → Update. Deixa Xcode 16.2+ al mateix `/Applications/Xcode.app`.brew ho detectarà automàticament.
2. **Actualitzar macOS a Sequoia 15+** i després `xcode-select --install` per obtenir CLT 16.2.
3. **(Alternativa)** Esborrar `/Applications/Xcode.app` i instal·lar només CLT 16.2 via `xcode-select --install` un cop macOS ≥ 15.

## Passos exactes (un cop Xcode ≥ 16.2)

### 1. Comprovar Xcode

```bash
xcodebuild -version
# Esperat: Xcode 16.2 o superior
```

### 2. Instal·lar Postgres

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

### 3. Crear usuari i base de dades

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

### 4. Apuntar l'API al Postgres real

Edita `apps/api/.env`:

```diff
- DATABASE_URL=pglite://./data/receptari
+ DATABASE_URL=postgres://receptari:receptari@localhost:5432/receptari
```

(Opcional) Esborra la DB de PGlite vella:

```bash
rm -rf apps/api/data
```

### 5. Aplicar les migracions

```bash
pnpm db:migrate
# Esperat: 🐘 Postgres → postgres://receptari:***@localhost:5432/receptari
#          ✅ Migracions aplicades
```

### 6. Verificar

```bash
pnpm test              # 23/23 (els tests sempre usen PGlite in-memory)
pnpm dev               # arrenca API + web
# Manual:
curl http://localhost:3000/api/health
```

## Notes

- Els tests **continuaran usant PGlite** (és correcte: cada test és independent). El driver només canvia en mode `dev`/`start`.
- Si en algun moment vols Docker, el `docker-compose.yml` ja està preparat — un cop tinguis Docker o Colima, `DATABASE_URL=postgres://receptari:receptari@localhost:5432/receptari` funciona igual.
