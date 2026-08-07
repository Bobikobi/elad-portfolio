import type { Locale } from './translations';

/**
 * The decorative worlds (R5.6). They are not section routes, so instead of a nav pill
 * they carry a small glass tooltip: the body's name, one REAL astronomy fact, and a
 * playful tie-in back to the site. Two of them do something when clicked.
 */
export type BodyAction = { kind: 'soon' } | null;

export interface BodyFact {
  name: Record<Locale, string>;
  /** One true astronomical fact. */
  fact: Record<Locale, string>;
  /** The wink — how that fact ties back to the work. */
  tie: Record<Locale, string>;
  action: BodyAction;
  /** Label for the action affordance, when there is one. */
  cta?: Record<Locale, string>;
}

// There is deliberately no CV affordance here. A download the site is not going to publish
// should not be hinted at anywhere in the UI — not as a link, and not as a "coming soon"
// pill standing in for one. Mercury carries its tooltip and nothing else.
export const BODY_FACTS: Record<string, BodyFact> = {
  mercury: {
    name: { he: 'כוכב חמה', en: 'Mercury', ru: 'Меркурий' },
    fact: {
      he: 'הקטן במערכת השמש - שנה שלמה שם אורכת 88 ימי-ארץ בלבד.',
      en: 'The smallest planet in the system - a whole year here lasts just 88 Earth days.',
      ru: 'Самая маленькая планета системы — год здесь длится всего 88 земных суток.',
    },
    tie: {
      he: 'מהיר. בערך כמו הזמן שלקח לדף הזה להיטען.',
      en: 'Fast. About as fast as this page finished loading.',
      ru: 'Быстро. Примерно как загрузилась эта страница.',
    },
    action: null,
  },
  venus: {
    name: { he: 'נוגה', en: 'Venus', ru: 'Венера' },
    fact: {
      he: 'מסתובבת לאחור - על נוגה השמש זורחת במערב ושוקעת במזרח.',
      en: 'It spins backwards - on Venus the sun rises in the west and sets in the east.',
      ru: 'Вращается в обратную сторону — на Венере солнце восходит на западе.',
    },
    tie: {
      he: 'משהו נבנה כאן בכיוון ההפוך. בקרוב.',
      en: 'Something is being built here, in reverse. Coming soon.',
      ru: 'Здесь что-то строится задом наперёд. Скоро.',
    },
    action: { kind: 'soon' },
    cta: { he: 'בקרוב', en: 'Coming soon', ru: 'Скоро' },
  },
  uranus: {
    name: { he: 'אורנוס', en: 'Uranus', ru: 'Уран' },
    fact: {
      he: 'שוכב על הצד - הקטבים שלו, ולא קו המשווה, הם שפונים אל השמש.',
      en: 'It lies on its side - its poles, not its equator, are what face the sun.',
      ru: 'Лежит на боку — к Солнцу обращены его полюса, а не экватор.',
    },
    tie: {
      he: 'לפעמים הפתרון הנכון הוא פשוט לסובב את הכל ב-90 מעלות.',
      en: 'Sometimes the right answer really is to turn the whole thing 90°.',
      ru: 'Иногда правильное решение — повернуть всё на 90°.',
    },
    action: null,
  },
  neptune: {
    name: { he: 'נפטון', en: 'Neptune', ru: 'Нептун' },
    fact: {
      he: 'הרוחות המהירות במערכת השמש נושבות כאן - עד 2,000 קמ״ש.',
      en: 'The fastest winds in the solar system blow here - up to 2,000 km/h.',
      ru: 'Здесь дуют самые быстрые ветры системы — до 2000 км/ч.',
    },
    tie: {
      he: 'בערך המהירות שבה עולה פריסה לפרודקשן.',
      en: 'Roughly the speed of a deploy going to production.',
      ru: 'Примерно скорость деплоя в прод.',
    },
    action: null,
  },
};

export const DECORATIVE_BODIES = Object.keys(BODY_FACTS);
