import Image from "next/image";
import { LogoMark } from "@/components/logo-mark";
import { MobileCta } from "@/components/mobile-cta";
import { SiteHeader } from "@/components/site-header";
import { TrackedLink } from "@/components/tracked-link";
import { TrackedSection } from "@/components/tracked-section";
import { beans, externalLinks, openingInfo } from "@/lib/content";

const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

const storyItems = [
  { number: "01", title: "街の少し奥で", body: "見つけた場所。", image: "/images/entrance-stairs.jpg", position: "18% center" },
  { number: "02", title: "コーヒーとの", body: "出会い。", image: "/images/coffee-space.jpg", position: "22% center" },
  { number: "03", title: "丁寧に、", body: "心を込めて。", image: "/images/coffee-pour.jpg", position: "72% center" },
  { number: "04", title: "この空間が", body: "生まれるまで。", image: "/images/entrance-stairs.jpg", position: "80% center" },
  { number: "05", title: "人と人をつなぐ、", body: "一杯を。", image: "/images/hero-barista.jpg", position: "78% center" },
];

const journalImages = [
  ["/images/coffee-space.jpg", "店内カウンターのコンセプトイメージ"],
  ["/images/entrance-stairs.jpg", "2階へ続く入口のコンセプトイメージ"],
  ["/images/pudding-and-coffee.jpg", "コーヒーとプリンのコンセプトイメージ"],
  ["/images/coffee-pour.jpg", "ハンドドリップのコンセプトイメージ"],
  ["/images/coffee-beans.jpg", "コーヒー豆パッケージのコンセプトイメージ"],
  ["/images/hero-barista.jpg", "バリスタのコンセプトイメージ"],
] as const;

const calendarDays = Array.from({ length: 35 }, (_, index) => index + 1);
const openDays = new Set([3, 4, 10, 11, 17, 18, 24, 25, 31]);
const eventDays = new Set([7, 14, 21, 28]);

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <TrackedSection id="top" className="hero" labelledBy="hero-title">
          <Image
            className="hero__image"
            src={asset("/images/hero-barista.jpg")}
            alt="暗い木のカウンターでハンドドリップするバリスタのコンセプトイメージ"
            fill
            priority
            sizes="100vw"
          />
          <div className="hero__shade" aria-hidden="true" />
          <div className="hero__inner page-shell">
            <div className="hero__mark" aria-hidden="true">
              <LogoMark size="large" />
              <strong>Bashiiin!</strong>
              <small>COFFEE &amp; CULTURE</small>
            </div>
            <div className="hero__copy">
              <p className="overline">SPECIALTY COFFEE / KYOTO</p>
              <h1 id="hero-title">ちょっといい珈琲を、<br />四条河原町の少し奥で。</h1>
              <p>丁寧に淹れた一杯と、静かにほどける時間。<br />日常のすぐそばで、いいひとときを。</p>
              <div className="button-row">
                <TrackedLink
                  href={externalLinks["open-info"].href!}
                  eventName="open_info_click"
                  placement="hero"
                  className="button button--amber"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  OPEN CALENDAR <span aria-hidden="true">↗</span>
                </TrackedLink>
                <a className="button button--slate" href="#coffee">VIEW COFFEE</a>
              </div>
            </div>
          </div>
        </TrackedSection>

        <TrackedSection id="about" className="about" labelledBy="about-title">
          <div className="page-shell about__grid">
            <div className="section-copy">
              <p className="section-label">ABOUT</p>
              <h2 id="about-title" className="sr-only">Bashiiin! coffeeについて</h2>
              <p>Bashiiin! は、京都・四条河原町の少し奥にある<br />スペシャルティコーヒースタンドです。</p>
              <p>厳選した豆と丁寧な抽出、そして心地よい空間で、<br />あなたの日常に、ちょっといい時間をお届けします。</p>
              <small className="content-note">CONCEPT COPY / 店舗確認後に正式文へ更新</small>
            </div>
            <div className="about__photo media-frame">
              <Image
                src={asset("/images/pudding-and-coffee.jpg")}
                alt="木のカウンターに置かれたコーヒーとプリンのコンセプトイメージ"
                fill
                sizes="(max-width: 760px) 100vw, 52vw"
              />
            </div>
          </div>
        </TrackedSection>

        <TrackedSection id="story" className="story ruled-section" labelledBy="story-title">
          <div className="page-shell">
            <h2 id="story-title" className="section-title">OUR STORY</h2>
            <ol className="story__grid">
              {storyItems.map((item) => (
                <li key={item.number}>
                  <div className="story__image media-frame">
                    <Image
                      src={asset(item.image)}
                      alt=""
                      fill
                      sizes="(max-width: 760px) 46vw, 18vw"
                      style={{ objectPosition: item.position }}
                    />
                  </div>
                  <span>{item.number}</span>
                  <p>{item.title}<br />{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </TrackedSection>

        <TrackedSection id="coffee" className="coffee-feature ruled-section" labelledBy="coffee-title">
          <Image
            className="coffee-feature__image"
            src={asset("/images/coffee-pour.jpg")}
            alt="コーヒー粉へ湯を注ぐハンドドリップのコンセプトイメージ"
            fill
            sizes="100vw"
          />
          <div className="coffee-feature__shade" aria-hidden="true" />
          <div className="page-shell coffee-feature__inner">
            <div className="section-copy section-copy--large">
              <h2 id="coffee-title">SPECIALTY<br />COFFEE</h2>
              <p>世界中から厳選したスペシャルティコーヒーを、<br />一杯ずつ丁寧にドリップ。</p>
              <p>豆の個性を引き出すための、<br />シンプルで誠実な一杯を。</p>
              <a href="#current-beans" className="outline-link">VIEW BEANS</a>
            </div>
          </div>
        </TrackedSection>

        <TrackedSection id="current-beans" className="beans ruled-section" labelledBy="beans-title">
          <div className="page-shell">
            <div className="section-heading-row">
              <h2 id="beans-title" className="section-title">CURRENT BEANS</h2>
              <span>ALL SAMPLE DATA</span>
            </div>
            <div className="beans__grid">
              {beans.map((bean, index) => (
                <article className="bean" key={bean.id}>
                  <div className="bean__copy">
                    <small>SAMPLE / 0{index + 1}</small>
                    <h3>{bean.name}</h3>
                    <p>{bean.flavor?.join(" / ")}</p>
                    <span>{index === 1 ? "MEDIUM" : "LIGHT"}</span>
                  </div>
                  <div className="bean__image">
                    <Image
                      src={asset("/images/coffee-beans.jpg")}
                      alt="ラベル未確定の金色コーヒー豆パッケージのコンセプトイメージ"
                      fill
                      sizes="(max-width: 760px) 100vw, 33vw"
                      style={{ objectPosition: `${12 + index * 38}% 62%` }}
                    />
                  </div>
                </article>
              ))}
            </div>
            <p className="fine-print">豆名・価格・在庫はサンプルです。最新の取扱情報は店頭またはInstagramでご確認ください。</p>
          </div>
        </TrackedSection>

        <TrackedSection id="culture" className="feature-grid ruled-section" labelledBy="culture-title">
          <h2 id="culture-title" className="sr-only">Sweets, Space and Culture</h2>
          <div className="page-shell feature-grid__inner">
            <article className="feature-card">
              <div className="feature-card__copy"><h3>SWEETS</h3><p>コーヒーと相性のよい、<br />手づくりのお菓子。</p><a href="#journal">VIEW SWEETS</a></div>
              <div className="feature-card__image media-frame"><Image src={asset("/images/pudding-and-coffee.jpg")} alt="プリンとコーヒーのコンセプトイメージ" fill sizes="50vw" style={{ objectPosition: "72% center" }} /></div>
            </article>
            <article id="space" className="feature-card feature-card--reverse">
              <div className="feature-card__copy"><h3>SPACE</h3><p>木の温もりと落ち着いた<br />灯りの小さな空間。</p><a href="#access">VIEW SPACE</a></div>
              <div className="feature-card__image media-frame"><Image src={asset("/images/coffee-space.jpg")} alt="木のカウンターが続く店内のコンセプトイメージ" fill sizes="50vw" /></div>
            </article>
            <article className="feature-card">
              <div className="feature-card__copy"><h3>CULTURE</h3><p>コーヒーとともに、<br />音楽やアート、カルチャーを。</p><a href={externalLinks.instagram.href!} target="_blank" rel="noopener noreferrer">VIEW JOURNAL</a></div>
              <div className="feature-card__image media-frame"><Image src={asset("/images/coffee-space.jpg")} alt="コーヒー器具が並ぶ店内のコンセプトイメージ" fill sizes="50vw" style={{ objectPosition: "78% center" }} /></div>
            </article>
            <article className="feature-card feature-card--statement">
              <div className="feature-card__copy"><h3>MORE<br />THAN<br />COFFEE.</h3><p>日常を少し豊かにする、<br />コーヒーとカルチャーの<br />ある暮らし。</p></div>
              <div className="feature-card__symbol" aria-hidden="true"><LogoMark size="large" /></div>
            </article>
          </div>
        </TrackedSection>

        <TrackedSection id="open-info" className="calendar-section ruled-section" labelledBy="calendar-title">
          <div className="page-shell calendar-section__grid">
            <div>
              <h2 id="calendar-title">OPEN<br />CALENDAR</h2>
              <p>営業カレンダー</p>
              <ul className="legend"><li><i className="is-open" />営業日</li><li><i className="is-event" />イベント・休業日</li></ul>
            </div>
            <div className="calendar">
              <header><strong>20XX / SAMPLE</strong></header>
              <div className="calendar__week"><span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span></div>
              <div className="calendar__days">
                {calendarDays.map((day) => <span key={day} className={openDays.has(day) ? "is-open" : eventDays.has(day) ? "is-event" : ""}>{day}</span>)}
              </div>
            </div>
            <div className="hours-card">
              <p>営業時間</p>
              <dl><div><dt>平日</dt><dd>店舗確認中</dd></div><div><dt>土日祝</dt><dd>店舗確認中</dd></div></dl>
              <small>{openingInfo.notice}</small>
              <TrackedLink href={externalLinks["open-info"].href!} eventName="open_info_click" placement="open-info" className="outline-link" target="_blank" rel="noopener noreferrer">VIEW CALENDAR ↗</TrackedLink>
            </div>
          </div>
        </TrackedSection>

        <TrackedSection id="access" className="access ruled-section" labelledBy="access-title">
          <div className="page-shell access__grid">
            <div className="access__copy">
              <h2 id="access-title">FIND US<br />ON THE 2F.</h2>
              <span className="status-chip">PROVISIONAL</span>
              <address>京都府京都市下京区<br />西木屋町通松原上ル<br />三丁目一之町239-1<br />やながわビル 2F</address>
              <TrackedLink href={externalLinks["google-maps"].href!} eventName="map_click" placement="access" className="outline-link" target="_blank" rel="noopener noreferrer">GOOGLE MAPS ↗</TrackedLink>
            </div>
            <div className="map-card" aria-label="店舗位置の概略図">
              <div className="map-card__grid" aria-hidden="true" />
              <span className="map-card__pin"><LogoMark />2F</span>
              <small>MAP / SAMPLE</small>
            </div>
            <div className="access__photo access__photo--door media-frame"><Image src={asset("/images/entrance-stairs.jpg")} alt="2階へ続く入口のコンセプトイメージ" fill sizes="25vw" style={{ objectPosition: "18% center" }} /></div>
            <div className="access__photo access__photo--stairs media-frame"><Image src={asset("/images/entrance-stairs.jpg")} alt="暖色の灯りが続く階段のコンセプトイメージ" fill sizes="25vw" style={{ objectPosition: "82% center" }} /></div>
          </div>
        </TrackedSection>

        <TrackedSection id="journal" className="journal ruled-section" labelledBy="journal-title">
          <div className="page-shell">
            <div className="section-heading-row">
              <h2 id="journal-title" className="section-title">INSTAGRAM JOURNAL</h2>
              <TrackedLink href={externalLinks.instagram.href!} eventName="instagram_click" placement="section" target="_blank" rel="noopener noreferrer">@bashiiin_coffee ↗</TrackedLink>
            </div>
            <div className="journal__grid">
              {journalImages.map(([src, alt], index) => <a key={`${src}-${index}`} href={externalLinks.instagram.href!} target="_blank" rel="noopener noreferrer" aria-label="Bashiiin! coffeeのInstagramを見る"><Image src={asset(src)} alt={alt} fill sizes="(max-width: 760px) 42vw, 16vw" /></a>)}
            </div>
            <p className="fine-print">掲載写真は完成イメージ確認用の生成素材です。許可済みInstagram写真の選定後、順次差し替え可能です。</p>
          </div>
        </TrackedSection>

        <TrackedSection id="final-cta" className="final-cta ruled-section" labelledBy="final-title">
          <div className="page-shell final-cta__grid">
            <h2 id="final-title">SEE YOU AT<br /><span>BASHIIIN!</span></h2>
            <div><p>ちょっといい珈琲と、<br />いい時間を。</p><div className="button-row"><TrackedLink href={externalLinks["open-info"].href!} eventName="open_info_click" placement="footer" className="button button--amber" target="_blank" rel="noopener noreferrer">OPEN CALENDAR ↗</TrackedLink><TrackedLink href={externalLinks.instagram.href!} eventName="instagram_click" placement="footer" className="button button--slate" target="_blank" rel="noopener noreferrer">INSTAGRAM ↗</TrackedLink></div></div>
            <div className="final-cta__mark" aria-hidden="true"><LogoMark size="large" /></div>
          </div>
        </TrackedSection>
      </main>

      <footer className="site-footer">
        <div className="page-shell"><span>© 2026 BASHIIIN! COFFEE — CONCEPT PREVIEW</span><span>UNOFFICIAL CONCEPT / SAMPLE</span><a href={externalLinks.instagram.href!} target="_blank" rel="noopener noreferrer">INSTAGRAM</a></div>
      </footer>
      <MobileCta />
    </>
  );
}
