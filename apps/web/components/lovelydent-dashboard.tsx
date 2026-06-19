"use client";

import { useState } from "react";

const nav = ["İdarə paneli", "Təqvim", "Pasiyentlər", "Müalicələr", "Kassa", "Anbar", "Tapşırıqlar"];
const icons = ["⌂", "◫", "P", "+", "₼", "□", "✓"];
const appointments = [
  ["09:00", "Aysel Məmmədova", "Dr. Nigar Əliyeva", "Müayinə", "Gözləyir"],
  ["10:30", "Murad Həsənli", "Dr. Elvin Qasımov", "Kanal müalicəsi", "Qəbulda"],
  ["12:00", "Leyla Rzayeva", "Dr. Nigar Əliyeva", "Diş təmizliyi", "Təsdiqlənib"],
  ["14:30", "Kamran İsmayılov", "Dr. Elvin Qasımov", "İmplant konsultasiyası", "Təsdiqlənib"],
];

export function LovelyDentDashboard() {
  const [active, setActive] = useState(nav[0]);
  return <main className="ld-app">
    <aside className="ld-sidebar">
      <div className="ld-brand"><img src="/lovelydent-icon.png" alt=""/><div><b>LovelyDent</b><span>Clinic management</span></div></div>
      <nav className="ld-nav"><small>İŞ SAHƏSİ</small>{nav.map((item, i) => <button key={item} onClick={() => setActive(item)} className={active === item ? "active" : ""}><i>{icons[i]}</i>{item}{item === "Tapşırıqlar" && <em>4</em>}</button>)}</nav>
      <div className="ld-user"><i>NƏ</i><div><b>Nərgiz Əliyeva</b><span>Administrator</span></div><button>•••</button></div>
    </aside>

    <section className="ld-content">
      <header className="ld-topbar"><div><span>Cümə, 19 iyun</span><h1>Sabahınız xeyir, Nərgiz</h1></div><div className="ld-actions"><label>⌕<input placeholder="Pasiyent, telefon və ya FIN axtar..."/></label><button className="ld-bell">♢<i/></button><button className="ld-primary">＋ Yeni randevu</button></div></header>
      <div className="ld-page">
        <section className="ld-stats">
          <Stat label="BUGÜNKÜ RANDEVULAR" value="18" detail="+3 dünənlə müqayisədə" icon="◫" tone="yellow"/>
          <Stat label="GÖZLƏYƏN PASİYENT" value="5" detail="Orta gözləmə: 12 dəq" icon="◷" tone="blue"/>
          <Stat label="BUGÜNKÜ GƏLİR" value="2 840 ₼" detail="78% günlük hədəf" icon="₼" tone="green"/>
          <Stat label="AKTİV MÜALİCƏ" value="32" detail="Bu həftə 8 tamamlanıb" icon="＋" tone="violet"/>
        </section>

        <section className="ld-grid">
          <article className="ld-card ld-schedule"><CardHead title="Bugünkü randevular" subtitle="18 randevudan növbəti 4-ü" action="Hamısına bax →"/><div className="ld-table-head"><span>SAAT</span><span>PASİYENT</span><span>HƏKİM / XİDMƏT</span><span>STATUS</span><span/></div>{appointments.map(a => <div className="ld-appt" key={a[0]}><b className="ld-time">{a[0]}</b><div className="ld-person"><i>{a[1].split(" ").map(v => v[0]).join("")}</i><p><b>{a[1]}</b><span>＋994 50 234 56 78</span></p></div><p><b>{a[2]}</b><span>{a[3]}</span></p><em className={a[4] === "Qəbulda" ? "live" : a[4] === "Gözləyir" ? "wait" : ""}>{a[4]}</em><button>•••</button></div>)}</article>

          <aside className="ld-card ld-quick"><CardHead title="Sürətli əməliyyatlar" subtitle="Tez-tez istifadə etdikləriniz"/>
            <div>{[["＋","Pasiyent əlavə et","Yeni pasiyent qeydiyyatı"],["₼","Ödəniş qəbul et","Kassa əməliyyatı"],["◫","Randevu yarat","Təqvimə əlavə et"],["✓","Tapşırıq ver","İşçiyə yönləndir"]].map(q => <button key={q[1]}><i>{q[0]}</i><b>{q[1]}</b><span>{q[2]}</span></button>)}</div>
          </aside>

          <article className="ld-card ld-doctors"><CardHead title="Həkimlərin iş yükü" subtitle="Bugünkü qəbul vəziyyəti" action="Həkimlər →"/>{[["NƏ","Dr. Nigar Əliyeva","Terapevt","6 / 8","75%"],["EQ","Dr. Elvin Qasımov","Cərrah-implantoloq","5 / 7","71%"],["SA","Dr. Samir Abbasov","Ortodont","4 / 6","66%"]].map(d => <div className="ld-doctor" key={d[1]}><i>{d[0]}</i><p><b>{d[1]}</b><span>{d[2]}</span></p><div><i style={{width:d[4]}}/><span>{d[3]} randevu</span></div></div>)}</article>

          <article className="ld-card ld-alerts"><CardHead title="Diqqət tələb edənlər" subtitle="Bu gün üçün xatırlatmalar"/>{[["!","3 gecikmiş ödəniş","Ümumi borc: 680 ₼"],["□","5 məhsul minimum stokdadır","Sifariş yaradılması tövsiyə olunur"],["✓","2 tapşırığın vaxtı keçir","İşçilərə bildiriş göndərilib"]].map(x => <div key={x[1]}><i>{x[0]}</i><p><b>{x[1]}</b><span>{x[2]}</span></p><button>Yoxla</button></div>)}</article>
        </section>
      </div>
    </section>
  </main>;
}

function Stat({label,value,detail,icon,tone}:{label:string;value:string;detail:string;icon:string;tone:string}) { return <article><span>{label}</span><b>{value}</b><small>{detail}</small><i className={tone}>{icon}</i></article>; }
function CardHead({title,subtitle,action}:{title:string;subtitle:string;action?:string}) { return <header className="ld-card-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button>{action}</button>}</header>; }
