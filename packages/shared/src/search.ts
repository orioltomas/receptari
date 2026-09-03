/**
 * Normalitza un text per a la cerca: minúscules i sense diacrítics.
 *
 * La normalització es fa a l'aplicació i no a la base de dades perquè PGlite
 * no inclou l'extensió `unaccent` i el projecte ha de funcionar tant amb
 * PGlite com amb Postgres real.
 */
export function normalizeForSearch(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}
