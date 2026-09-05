import { LanguageCode } from '../../types';
import { en } from './en';
import { hi } from './hi';
import { bn, as, or, mai, mni, sat, brx } from './eastern';
import { ta, te, kn, ml } from './southern';
import { mr, gu, doi, ks, kok, ne, sa, sd } from './western_northern';
import { ur } from './ur';
import { pa } from './punjabi';

export const ALL_TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en,
  hi,
  as,
  bn,
  brx,
  doi,
  gu,
  kn,
  ks,
  kok,
  mai,
  ml,
  mni,
  mr,
  ne,
  or,
  pa,
  sa,
  sat,
  sd,
  ta,
  te,
  ur,
};
