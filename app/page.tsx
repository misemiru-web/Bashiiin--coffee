import { MobileCta } from "@/components/mobile-cta";
import { SiteHeader } from "@/components/site-header";
import { TrackedLink } from "@/components/tracked-link";
import { TrackedSection } from "@/components/tracked-section";
import { LogoMark } from "@/components/logo-mark";
import { beans, cultureItems, externalLinks, openingInfo } from "@/lib/content";

const calendarDays = Array.from({ length: 35 }, (_, index) => index + 1);
const openDays = new Set([2, 3, 6, 7, 9, 10, 13, 14, 16, 17, 20, 21, 23, 24, 27, 28]);

const statusLabel = {
  confirmed: "CONFIRMED",
  "official-public": "PUBLIC INFO",
  "third-party": "PROVISIONAL",
  sample: "SAMPLE",
} as const;

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <TrackedSection id="top" className="hero" labelledBy="hero-title">
          <div className="hero-noise" aria-hidden="true" />
          <div className="hero-orbit hero-orbit--one" aria-hidden="true" />
          <div className="hero-orbit hero-orbit--two" aria-hidden="true" />
          <div className="hero-copy">
            <p className="eyebrow">SPECIALTY COFFEE / KYOTO KAWARAMACHI</p>
            <h1 id="hero-title">
              <span>BASHIIIN!</span>
              <span>COFFEE</span>
            </h1>
            <div className="hero-copy__bottom">
              <p className="hero-lead">ちょっといい珈琲を、<br />四条河原町の少し南で。</p>
              <div className="hero-actions">
                <TrackedLink
                  href={externalLinks["open-info"].href!}
                  eventName="open_info_click"
                  placement="hero"
                  className="button button--orange"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>営業情報を確認</span><b aria-hidden="true">↗</b>
                </TrackedLink>
                <TrackedLink
                  href={externalLinks["google-maps"].href!}
                  eventName="map_click"
                  placement="hero"
                  className="text-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GOOGLE MAPS <span aria-hidden="true">↗</span>
                </TrackedLink>
              </div>
            </div>
          </div>
          <div className="hero-art" aria-label="許諾済み店舗写真の差し替え領域">
            <div className="hero-art__poster">
              <span>APPROVED<br />IMAGE SLOT</span>
              <small>PHOTO / 01</small>
            </div>
            <div className="hero-art__cup" aria-hidden="true">
              <i className="steam steam--one" />
              <i className="steam steam--two" />
              <span />
            </div>
            <div className="hero-art__stamp" aria-hidden="true">
              <LogoMark size="large" />
              <span>SERIOUS COFFEE<br />PLAYFUL CULTURE</span>
            </div>
          </div>
          <div className="scroll-note" aria-hidden="true"><span /> SCROLL TO TASTE</div>
        </TrackedSection>

        <TrackedSection id="about" className="about section-light" labelledBy="about-title">
          <div className="section-index">01 — ABOUT</div>
          <div className="about-grid">
            <div>
              <p className="kicker">A COFFEE BREAK,<br />WITH A LITTLE IMPACT.</p>
              <h2 id="about-title">コーヒーの真剣さと、<br />カルチャーの遊び心。</h2>
            </div>
            <div className="about-copy">
              <p>
                暗く温かい空間、丁寧に向き合う一杯、ポスターやグッズの自由な色。Bashiiin! coffeeの二面性を、ひとつのWeb体験として再構成するコンセプトです。
              </p>
              <p className="sample-disclaimer">SAMPLE COPY — 店舗確認後に正式文へ差し替え</p>
            </div>
          </div>
          <ol className="entry-sequence" aria-label="店舗までの導線イメージ">
            {[
              ["01", "THE CITY", "四条河原町から、少し南へ。"],
              ["02", "THE BUILDING", "街に溶け込む入口を探す。"],
              ["03", "THE STAIRS", "階段を上がって2Fへ。"],
              ["04", "BASHIIIN!", "扉の先で、コーヒーブレイク。"],
            ].map(([number, title, description], index) => (
              <li key={number}>
                <span className="entry-sequence__number">{number}</span>
                <div className={`entry-visual entry-visual--${index + 1}`} aria-hidden="true">
                  <span>APPROVED IMAGE</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </TrackedSection>

        <TrackedSection id="coffee" className="coffee section-dark" labelledBy="coffee-title">
          <div className="coffee-marquee" aria-hidden="true">
            <span>SPECIALTY COFFEE • SPECIALTY COFFEE • SPECIALTY COFFEE • </span>
          </div>
          <div className="section-shell">
            <div className="section-index section-index--light">02 — COFFEE / CURRENT BEANS</div>
            <div className="coffee-intro">
              <div>
                <p className="eyebrow eyebrow--green">SERIOUS ABOUT THE CUP</p>
                <h2 id="coffee-title">TODAY&apos;S<br />COFFEE.</h2>
              </div>
              <p>
                産地、精製、焙煎、抽出。それぞれの違いを難しく見せすぎず、一杯を選ぶ楽しさへ。ここは、現在楽しめる豆を更新できる本番UIのサンプルです。
              </p>
            </div>
            <div className="bean-grid">
              {beans.map((bean, index) => (
                <article key={bean.id} className={`bean-card bean-card--${index + 1}`}>
                  <header>
                    <span>{statusLabel[bean.source.status]}</span>
                    <b>0{index + 1}</b>
                  </header>
                  <div className="bean-symbol" aria-hidden="true"><span /></div>
                  <h3>{bean.name}</h3>
                  <dl>
                    <div><dt>COUNTRY</dt><dd>{bean.country}</dd></div>
                    <div><dt>REGION</dt><dd>{bean.region}</dd></div>
                    <div><dt>PROCESS</dt><dd>{bean.process}</dd></div>
                    <div><dt>ROAST</dt><dd>{bean.roast}</dd></div>
                  </dl>
                  <ul aria-label="フレーバー候補">
                    {bean.flavor?.map((flavor) => <li key={flavor}>{flavor}</li>)}
                  </ul>
                </article>
              ))}
            </div>
            <p className="data-note">※ 表示されている豆情報はUI確認用で、実在商品・在庫情報ではありません。</p>
          </div>
        </TrackedSection>

        <TrackedSection id="sweets" className="sweets" labelledBy="sweets-title">
          <div className="sweets-art" aria-label="許諾済みスイーツ写真の差し替え領域">
            <div className="sweets-art__label">APPROVED<br />IMAGE SLOT</div>
            <div className="plate" aria-hidden="true"><span className="pudding" /></div>
            <div className="sweets-sticker" aria-hidden="true">COFFEE&apos;S<br />BEST FRIEND</div>
          </div>
          <div className="sweets-copy">
            <div className="section-index">03 — SWEETS</div>
            <p className="eyebrow eyebrow--red">SOMETHING SWEET</p>
            <h2 id="sweets-title">A LITTLE<br />MORE, PLEASE.</h2>
            <p>
              コーヒーの余韻に、もうひとつ。プリンや焼き菓子などを紹介できる領域です。正式商品名と価格は、店舗確認後に掲載します。
            </p>
            <div className="sweets-tags" aria-label="サンプルコンテンツ候補">
              <span>SAMPLE CONTENT</span><span>PUDDING</span><span>BAKED SWEETS</span>
            </div>
          </div>
        </TrackedSection>

        <TrackedSection id="culture" className="culture" labelledBy="culture-title">
          <div className="culture-heading">
            <div className="section-index section-index--light">04 — SPACE / BASHIIIN! CULTURE</div>
            <p className="eyebrow eyebrow--orange">MORE THAN COFFEE</p>
            <h2 id="culture-title">COFFEE,<br />GOODS,<br />PEOPLE &<br />CULTURE.</h2>
          </div>
          <div className="culture-collage">
            <div className="collage-space" aria-label="許諾済み店内写真の差し替え領域">
              <span>SPACE / APPROVED IMAGE SLOT</span>
              <i aria-hidden="true" />
            </div>
            <div className="collage-note">
              <p>暗い空間に、アンバーの光。コーヒー器具と木のカウンター。</p>
              <small>SAMPLE COPY</small>
            </div>
            <div className="collage-poster" aria-hidden="true">
              <LogoMark size="large" />
              <strong>BASHIIIN!</strong>
              <span>KYOTO / COFFEE / CULTURE</span>
            </div>
          </div>
          <div className="culture-cards">
            {cultureItems.map((item, index) => (
              <article key={item.id} className={`culture-card culture-card--${index + 1}`}>
                <span className="sample-chip">{statusLabel[item.source.status]}</span>
                <small>0{index + 1} / {item.category.toUpperCase()}</small>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <i aria-hidden="true">↗</i>
              </article>
            ))}
          </div>
        </TrackedSection>

        <TrackedSection id="open-info" className="open-info" labelledBy="open-title">
          <div className="open-copy">
            <div className="section-index">05 — OPEN INFO</div>
            <p className="eyebrow">BEFORE YOU VISIT</p>
            <h2 id="open-title">ARE WE<br />OPEN?</h2>
            <p>
              営業日は変動する場合があります。ご来店前に、Instagramで最新情報をご確認ください。
            </p>
            <TrackedLink
              href={externalLinks["open-info"].href!}
              eventName="open_info_click"
              placement="open-info"
              className="button button--dark"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>最新の営業情報を見る</span><b aria-hidden="true">↗</b>
            </TrackedLink>
          </div>
          <div className="calendar-wrap">
            <div className="calendar-alert"><b>SAMPLE CALENDAR</b><span>実際の営業日ではありません</span></div>
            <div className="calendar-header"><span>20XX</span><strong>MONTH / XX</strong><LogoMark /></div>
            <div className="calendar-weekdays" aria-hidden="true">
              {['M','T','W','T','F','S','S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
            </div>
            <div className="calendar-grid" aria-label="サンプル営業カレンダー">
              {calendarDays.map((day) => (
                <span key={day} className={openDays.has(day) ? "is-open" : ""}>
                  {day}<i>{openDays.has(day) ? "OPEN" : "—"}</i>
                </span>
              ))}
            </div>
            <p>{openingInfo.notice}</p>
          </div>
        </TrackedSection>

        <TrackedSection id="access" className="access section-light" labelledBy="access-title">
          <div className="section-index">06 — ACCESS</div>
          <div className="access-heading">
            <div>
              <p className="eyebrow eyebrow--blue">LOOK UP. WE&apos;RE UPSTAIRS.</p>
              <h2 id="access-title">FIND US<br />ON THE 2F.</h2>
            </div>
            <div className="access-address">
              <span className="sample-chip sample-chip--dark">PROVISIONAL / 店舗確認前</span>
              <address>
                京都府京都市下京区<br />西木屋町通松原上ル<br />三丁目一之町239-1<br /><strong>やながわビル 2F</strong>
              </address>
              <p>阪急 京都河原町駅から徒歩圏内</p>
              <TrackedLink
                href={externalLinks["google-maps"].href!}
                eventName="map_click"
                placement="access"
                className="button button--blue"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Google Mapsで確認</span><b aria-hidden="true">↗</b>
              </TrackedLink>
            </div>
          </div>
          <div className="route-map" aria-label="店舗までの案内イメージ">
            <div className="route-grid" aria-hidden="true" />
            <svg viewBox="0 0 900 380" role="img" aria-label="河原町から店舗2階までのサンプル経路図">
              <path d="M45 310 C 160 260, 180 80, 345 105 S 520 315, 700 230 S 820 110, 865 70" />
              <circle cx="48" cy="310" r="16" />
              <circle cx="865" cy="70" r="25" />
            </svg>
            <span className="route-label route-label--start">KAWARAMACHI</span>
            <span className="route-label route-label--end">BASHIIIN!<br /><b>2F</b></span>
            <div className="route-steps">
              <span>01 MAP</span><span>02 BUILDING</span><span>03 ENTRANCE</span><span>04 STAIRS</span><span>05 2F</span>
            </div>
          </div>
          <p className="data-note data-note--dark">住所・アクセス情報は第三者公開情報をもとにした暫定表示です。店舗確認後に確定します。</p>
        </TrackedSection>

        <TrackedSection id="journal" className="journal" labelledBy="journal-title">
          <div className="journal-heading">
            <div className="section-index">07 — BASHIIIN! JOURNAL</div>
            <h2 id="journal-title">WHAT&apos;S<br />HAPPENING?</h2>
            <p>コーヒー、イベント、グッズ。最新のBashiiin!はInstagramへ。</p>
            <TrackedLink
              href={externalLinks.instagram.href!}
              eventName="instagram_click"
              placement="section"
              className="text-link text-link--dark"
              target="_blank"
              rel="noopener noreferrer"
            >
              @BASHIIIN_COFFEE <span aria-hidden="true">↗</span>
            </TrackedLink>
          </div>
          <div className="journal-grid" aria-label="Instagram連携のサンプルレイアウト">
            <article className="journal-card journal-card--orange">
              <span>SAMPLE 01</span><strong>COFFEE<br />NEWS</strong><small>API NOT CONNECTED</small>
            </article>
            <article className="journal-card journal-card--photo">
              <span>APPROVED<br />IMAGE SLOT</span><small>POST / 02</small>
            </article>
            <article className="journal-card journal-card--cream">
              <LogoMark size="large" /><strong>GOOD<br />COFFEE,<br />GOOD<br />PEOPLE.</strong>
            </article>
            <article className="journal-card journal-card--blue">
              <span>SAMPLE 04</span><strong>KYOTO<br />COFFEE<br />CULTURE</strong><small>EDITORIAL CARD</small>
            </article>
          </div>
          <p className="journal-note">Instagram投稿画像・本文は転載していません。掲載許諾後に差し替える想定です。</p>
        </TrackedSection>

        <TrackedSection id="final-cta" className="final-cta" labelledBy="final-title">
          <div className="final-symbol" aria-hidden="true"><LogoMark size="large" /></div>
          <p className="eyebrow eyebrow--orange">SEE YOU AT BASHIIIN!</p>
          <h2 id="final-title">次の珈琲は、<br /><span>Bashiiin!</span>で。</h2>
          <div className="final-actions">
            <TrackedLink
              href={externalLinks["open-info"].href!}
              eventName="open_info_click"
              placement="footer"
              className="button button--orange"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>営業情報を確認</span><b aria-hidden="true">↗</b>
            </TrackedLink>
            <TrackedLink
              href={externalLinks["google-maps"].href!}
              eventName="map_click"
              placement="footer"
              className="button button--outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Google Maps</span><b aria-hidden="true">↗</b>
            </TrackedLink>
            <TrackedLink
              href={externalLinks.instagram.href!}
              eventName="instagram_click"
              placement="footer"
              className="button button--outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Instagram</span><b aria-hidden="true">↗</b>
            </TrackedLink>
          </div>
        </TrackedSection>
      </main>

      <footer className="site-footer">
        <div className="site-footer__brand"><LogoMark /><strong>BASHIIIN! COFFEE</strong></div>
        <p>UNOFFICIAL CONCEPT / SAMPLE<br />営業提案用の非公式サイトです</p>
        <small>© 2026 CONCEPT PREVIEW — NOT AN OFFICIAL WEBSITE</small>
      </footer>
      <MobileCta />
    </>
  );
}
