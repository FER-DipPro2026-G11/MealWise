# MealWise

Sve naredbe pokretati iz root-a repozitorija.

Za pokrenuti prilikom developmenta:

- `npm run dev`

Za pokrenuti u produkciji:

- `npm run build`
- `npm run start`

Baza podataka (potrebna je `.env` datoteka u root-u, vidi `.env.example`):

- Shema je u `server/src/db/schema.sql`, početni podaci u `server/src/db/seed.sql`.
- Ako je baza prazna, server pri startu sam izvrši obje datoteke.
- `npm run db:reset` - **briše sve podatke** i ponovno izvrši `schema.sql` i `seed.sql`. Pokrenuti nakon svake promjene sheme. Pazi: lokalni `.env` vjerojatno pokazuje na produkcijsku bazu na Renderu.
- `npm run db:dump` - spremi cijelu bazu (shemu i podatke) u `server/src/db/dumps/dump-<vrijeme>.sql`. Dumpovi sadrže stvarne podatke korisnika i ne commitaju se.
- `npm run db:restore` - **briše sve podatke** i učita najnoviji dump. Za određenu datoteku: `npm run db:restore -- putanja/do/dump.sql`.

Lint i formatiranje:

- `npm run lint`
- `npm run format`

Formatiranje bi se trebalo i automatski pokrenuti prilikom svakog commita.
