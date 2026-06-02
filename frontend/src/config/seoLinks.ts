export interface SeoLink {
  href: string;
  label: string;
}

export interface SeoCluster {
  title: string;
  links: SeoLink[];
}

/**
 * Единый источник внутренних SEO-ссылок. Используется в SiteFooter (mega-футер)
 * и в секции «По теме» на главной. Покрывает все 33 SEO-лендинга без дублей —
 * это страховка от рассинхрона перелинковки между футером и контентом.
 */
export const SEO_CLUSTERS: SeoCluster[] = [
  {
    title: "Форматы",
    links: [
      { href: "/audio-v-tekst", label: "Аудио в текст" },
      { href: "/mp3-v-tekst", label: "MP3 в текст" },
      { href: "/diktofon-v-tekst", label: "Диктофон в текст" },
      { href: "/video-v-tekst", label: "Видео в текст" },
      { href: "/youtube-v-tekst", label: "YouTube в текст" },
      { href: "/rasshifrovka-golosovyh", label: "Голосовые сообщения" },
      { href: "/subtitry-dlya-video", label: "Субтитры для видео" },
      { href: "/iz-ssylki", label: "По ссылке" },
    ],
  },
  {
    title: "Задачи и кейсы",
    links: [
      { href: "/protokol-soveshchaniya", label: "Протокол совещания" },
      { href: "/rasshifrovka-intervyu", label: "Расшифровка интервью" },
      { href: "/zoom-v-tekst", label: "Расшифровка Zoom" },
      { href: "/dlya-biznesa", label: "Для бизнеса" },
      { href: "/dlya-zhurnalistov", label: "Для журналистов" },
      { href: "/dlya-podkastov", label: "Для подкастов" },
      { href: "/dlya-lekcij", label: "Для лекций" },
    ],
  },
  {
    title: "Языки",
    links: [
      { href: "/russkij-yazyk", label: "Русский" },
      { href: "/anglijskij-yazyk", label: "Английский" },
      { href: "/nemeckij-yazyk", label: "Немецкий" },
      { href: "/francuzskij-yazyk", label: "Французский" },
      { href: "/kazahskij-yazyk", label: "Казахский" },
    ],
  },
  {
    title: "Транскрибация",
    links: [
      { href: "/transkribaciya", label: "Транскрибация" },
      { href: "/transkribaciya-audio", label: "Транскрибация аудио" },
      { href: "/transkribaciya-video", label: "Транскрибация видео" },
      { href: "/transkribaciya-onlayn", label: "Транскрибация онлайн" },
      { href: "/rasshifrovka-audio", label: "Расшифровка аудио" },
      { href: "/rasshifrovka-video", label: "Расшифровка видео" },
      { href: "/raspoznavanie-rechi", label: "Распознавание речи" },
    ],
  },
  {
    title: "Ещё",
    links: [
      { href: "/perevod-audio-v-tekst", label: "Перевод аудио в текст" },
      { href: "/perevesti-audio-v-tekst", label: "Перевести аудио в текст" },
      { href: "/nejroset-transkribaciya", label: "Нейросеть" },
      { href: "/preobrazovat-audio", label: "Преобразовать аудио" },
      { href: "/bez-registracii", label: "Без регистрации" },
      { href: "/audio-v-tekst-besplatno", label: "Бесплатно" },
    ],
  },
];
