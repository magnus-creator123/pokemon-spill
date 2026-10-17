const SETT = {
    ASC: { navn: "Ascended Heroes" },
    "30C": { navn: "30th Celebration" },
    BSE: { navn: "Base Set 1st Edition" }
};

const EUR_TIL_NOK = 11.7;
const USD_TIL_NOK = 10.2;

// Prisene for ugraderte Base Set 1st Edition-kort i USD
const BSE_PRICE_USD = {
    "1": 651, "2": 1250, "3": 400, "4": 12706,
    "5": 288.46, "6": 446.84, "7": 306.69, "8": 15.19,
    "9": 300, "10": 345, "11": 416.89, "12": 430.61,
    "13": 360, "14": 345.06, "15": 1154.86, "16": 331.51,
    "17": 18, "18": 50, "19": 25, "20": 25,
    "21": 22, "22": 25, "23": 12, "24": 15,
    "25": 12, "26": 10, "27": 8, "28": 8,
    "29": 10, "30": 20, "31": 8, "32": 8,
    "33": 7, "34": 7, "35": 12, "36": 10,
    "37": 10, "38": 8, "39": 12, "40": 8,
    "41": 7, "42": 15, "43": 8, "44": 200,
    "45": 5, "46": 129.98, "47": 5, "48": 5,
    "49": 5, "50": 6, "51": 5, "52": 5,
    "53": 6, "54": 6, "55": 5, "56": 6,
    "57": 10, "58": 190, "59": 6, "60": 5,
    "61": 5, "62": 6, "63": 104.07, "64": 5,
    "65": 5, "66": 5, "67": 6, "68": 5,
    "69": 5, "70": 20, "71": 12, "72": 15,
    "73": 10, "74": 25, "75": 12, "76": 20,
    "77": 12, "78": 20, "79": 12, "80": 6,
    "81": 5, "82": 6, "83": 8, "84": 6,
    "85": 10, "86": 8, "87": 5, "88": 10,
    "89": 8, "90": 5, "91": 5, "92": 5,
    "93": 5, "94": 4, "95": 5, "96": 30,
    "97": 5, "98": 5, "99": 5, "100": 5,
    "101": 5, "102": 5
};

let poeng = 10000;
localStorage.setItem("pokemonSaldo", "10000");

let samling;
try {
    samling = JSON.parse(localStorage.getItem("pokemonSamling") || "[]");
    if (!Array.isArray(samling)) samling = [];
} catch {
    samling = [];
}

let alleKort = {
    ASC: [],
    "30C": [],
    BSE: []
};
let gjeldendeKort = null;
let kortSomSkalVelges = [];
let kortNummer = 0;
let pakkeAktiv = false;
let bonusBrukt = localStorage.getItem("pokemonBonusBrukt") === "true";

const melding = document.getElementById("melding");
const poengTekst = document.getElementById("poeng");

function lagreSpill() {
    localStorage.setItem("pokemonSaldo", String(poeng));
    localStorage.setItem("pokemonSamling", JSON.stringify(samling));
    localStorage.setItem("pokemonBonusBrukt", String(bonusBrukt));
}

function oppdaterPoeng() {
    poeng = Math.round(poeng * 100) / 100;

    poengTekst.textContent = poeng.toLocaleString("nb-NO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    lagreSpill();
}

function formaterPris(pris) {
    return new Intl.NumberFormat("nb-NO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(pris) + " kr";
}

// Laster inn Pokémon-kortene
async function lastInnKort() {
    try {
        melding.textContent = "Laster inn kortsettene ...";

        const svar = await fetch("https://api.tcgdex.net/v2/en/sets");
        if (!svar.ok) throw new Error("Kunne ikke hente kortsettene.");

        const settListe = await svar.json();

        const funnet = {
    ASC: settListe.find(s =>
        (s.name || "").toLowerCase().includes("ascended heroes")
    ),
    "30C": settListe.find(s =>
        (s.name || "").toLowerCase().includes("30th celebration")
    ),
    BSE: settListe.find(s => s.id === "base1")
};

        for (const id of Object.keys(SETT)) {
            if (!funnet[id]) {
                throw new Error("Fant ikke settet: " + SETT[id].navn);
            }

            const respons = await fetch(
                `https://api.tcgdex.net/v2/en/sets/${funnet[id].id}`
            );

            if (!respons.ok) {
                throw new Error("Kunne ikke laste " + SETT[id].navn);
            }

            const data = await respons.json();

            alleKort[id] = (data.cards || []).map(kort => ({
                ...kort,
                setNavn: SETT[id].navn,
                setId: id
            }));
        }

        melding.textContent = "Klar! Velg en pakke.";

    } catch (feil) {
        console.error(feil);
        melding.textContent =
            "Kunne ikke laste kortene. Oppdater siden og prøv igjen.";
    }
}

// Bestemmer hvor sjeldent kortet er
function kategori(kort) {
    const r = (kort.rarity || "").toLowerCase();

    if (
        r.includes("illustration") ||
        r.includes("special art") ||
        r.includes("hyper rare") ||
        r.includes("secret rare")
    ) {
        return "Veldig sjelden";
    }

    if (r.includes("ultra rare") || r.includes("double rare")) {
        return "Sjelden";
    }

    if (
        r.includes("uncommon") ||
        r.includes("rare") ||
        r.includes("holo")
    ) {
        return "Uvanlig";
    }

    return "Vanlig";
}

// Trekker et tilfeldig kort
function trekkKort(kortListe, plass, setId) {
    const vanlige = kortListe.filter(k =>
        ["Common", "Common 1", "Common 2"].includes(k.rarity)
    );

    const uvanlige = kortListe.filter(k =>
        (k.rarity || "").toLowerCase().includes("uncommon")
    );

    const sjeldne = kortListe.filter(k => {
        const r = (k.rarity || "").toLowerCase();
        return r.includes("rare") &&
            !r.includes("double") &&
            !r.includes("ultra") &&
            !r.includes("illustration") &&
            !r.includes("hyper") &&
            !r.includes("secret") &&
            !r.includes("special");
    });

    const hits = kortListe.filter(k => {
        const r = (k.rarity || "").toLowerCase();
        return (
            r.includes("double rare") ||
            r.includes("ultra rare") ||
            r.includes("illustration rare") ||
            r.includes("special illustration") ||
            r.includes("hyper rare") ||
            r.includes("secret rare")
        );
    });

    const velg = liste =>
        liste.length
            ? liste[Math.floor(Math.random() * liste.length)]
            : kortListe[Math.floor(Math.random() * kortListe.length)];

    const tilfeldig = Math.random();

    // Kort 1–5: Vanlige eller uvanlige kort
    if (plass <= 5) {
        return velg(vanlige.length ? vanlige : uvanlige);
    }

    // Kort 6–8: Vanlige 75 % / 70 %, uvanlige resten
    if (plass <= 8) {
        const vanligSjanse = setId === "30C" ? 0.70 : 0.75;

        if (tilfeldig < vanligSjanse) {
            return velg(vanlige.length ? vanlige : uvanlige);
        }

        return velg(uvanlige.length ? uvanlige : sjeldne);
    }

    // Kort 9: 6 % / 7 % sjanse for hit
    if (plass === 9) {
        const hitSjanse = setId === "30C" ? 0.07 : 0.06;

        if (tilfeldig < hitSjanse && hits.length) {
            return velg(hits);
        }

        return velg(sjeldne.length ? sjeldne : uvanlige);
    }

    // Kort 10: 1 % sjanse for superhit
    if (plass === 10) {
        if (tilfeldig < 0.01 && hits.length) {
            return velg(hits);
        }

        return velg(sjeldne.length ? sjeldne : uvanlige);
    }

    return velg(vanlige.length ? vanlige : uvanlige);
}

// Henter detaljer og eventuell markedspris
async function hentKortDetaljer(kort) {
    try {
        const svar = await fetch(
            `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(kort.id)}`
        );

        if (!svar.ok) return kort;

        const detaljer = await svar.json();

        return {
            ...kort,
            ...detaljer,
            setNavn: kort.setNavn,
            setId: kort.setId
        };

    } catch (feil) {
        console.warn("Kunne ikke hente detaljer for", kort.name, feil);
        return kort;
    }
}

// Henter markedspris hvis prisdata finnes
function finnMarkedspris(kort) {
    if (kort.setId === "BSE") {
        const usd = BSE_PRICE_USD[String(kort.localId)];

        if (typeof usd === "number") {
            return usd * USD_TIL_NOK;
        }

        return null;
    }

    const priser = kort.pricing;
    if (!priser) return null;

    const cm = priser.cardmarket;
    if (cm) {
        const euro = cm.trend ?? cm.avg ?? cm.avg30;

        if (typeof euro === "number" && euro > 0) {
            return euro * EUR_TIL_NOK;
        }
    }

    const tcg = priser.tcgplayer;
    if (tcg) {
        const varianter = [
            tcg.holofoil,
            tcg.normal,
            tcg.reverseHolofoil
        ];

        for (const variant of varianter) {
            const usd = variant?.marketPrice ?? variant?.midPrice;

            if (typeof usd === "number" && usd > 0) {
                return usd * USD_TIL_NOK;
            }
        }
    }

    return null;
}

// Hvis et kort mangler prisdata, får det en anslått salgsverdi
function prisForSalg(kort) {
    const markedspris = finnMarkedspris(kort);

    if (markedspris !== null) {
        return { belop: markedspris, anslag: false };
    }

    const sjeldenhet = kategori(kort);

    if (sjeldenhet === "Veldig sjelden") {
        return { belop: 25, anslag: true };
    }

    if (sjeldenhet === "Sjelden") {
        return { belop: 8, anslag: true };
    }

    if (sjeldenhet === "Uvanlig") {
        return { belop: 1, anslag: true };
    }

    return { belop: 0.4, anslag: true };
}

// Åpner en pakke med 10 kort
async function apnePakke(setId) {
    if (pakkeAktiv) {
        melding.textContent =
            "Selg eller behold kortet du ser på først!";
        return;
    }

    if (!alleKort[setId] || alleKort[setId].length === 0) {
        melding.textContent =
            "Kortene er ikke lastet inn ennå. Vent litt eller oppdater siden.";
        return;
    }

    const priser = {
    ASC: 200,
    "30C": 180,
    BSE: 60000
};

const pris = priser[setId];

    if (poeng < pris) {
        melding.textContent = "Du har ikke nok penger!";
        return;
    }

    poeng -= pris;
    oppdaterPoeng();

    pakkeAktiv = true;
    kortNummer = 0;
    melding.textContent = "Åpner pakken ...";

    const trukket = [];

for (let i = 1; i <= 10; i++) {
    trukket.push(trekkKort(alleKort[setId], i, setId));
}

    const detaljer = await Promise.all(
        trukket.map(kort => hentKortDetaljer(kort))
    );

    // Bland kortene før de vises
    function kortScore(kort) {
    const pris = finnMarkedspris(kort) || 0;

    const r = (kort.rarity || "").toLowerCase();

    let sjeldenhet = 0;

    if (r.includes("common")) sjeldenhet = 1;
    else if (r.includes("uncommon")) sjeldenhet = 2;
    else if (r.includes("rare") && !r.includes("double")) sjeldenhet = 3;
    else if (r.includes("double rare")) sjeldenhet = 4;
    else if (
        r.includes("illustration") ||
        r.includes("ultra rare")
    ) sjeldenhet = 5;
    else if (
        r.includes("special illustration") ||
        r.includes("hyper rare") ||
        r.includes("secret rare")
    ) sjeldenhet = 6;

    return sjeldenhet * 1000 + pris;
}

kortSomSkalVelges = detaljer.sort(
    (a, b) => kortScore(a) - kortScore(b)
);

    visNesteKort();
}

// Viser ett kort om gangen
function visNesteKort() {
    const valgBoks = document.getElementById("kortValg");

    if (kortSomSkalVelges.length === 0) {
        gjeldendeKort = null;
        pakkeAktiv = false;
        valgBoks.hidden = true;

        document.getElementById("nyeKort").innerHTML = "";

        visKort(samling, "samling");

        document.getElementById("antallKort").textContent =
            samling.length;

        melding.textContent =
            "Pakken er ferdig! Du kan åpne en ny pakke.";

        lagreSpill();
        return;
    }

    gjeldendeKort = kortSomSkalVelges.shift();
    kortNummer++;

    visKort([gjeldendeKort], "nyeKort");
    valgBoks.hidden = false;

    const pris = prisForSalg(gjeldendeKort);

    const verdiTekst = pris.anslag
        ? `${formaterPris(pris.belop)} (anslått)`
        : formaterPris(pris.belop);

    melding.textContent =
        `Kort ${kortNummer} av 10: ${gjeldendeKort.name} — salgsverdi: ${verdiTekst}`;
}

// SELG KORT
function selgKort() {
    if (!gjeldendeKort) return;

    const kort = gjeldendeKort;
    const pris = prisForSalg(kort);

    poeng += pris.belop;
    oppdaterPoeng();

    melding.textContent =
        `Du solgte ${kort.name} for ${formaterPris(pris.belop)}` +
        (pris.anslag ? " (anslått pris)!" : "!");

    gjeldendeKort = null;
    visNesteKort();
}

// BEHOLD KORT
function beholdKort() {
    if (!gjeldendeKort) return;

    const navn = gjeldendeKort.name;

    samling.push(gjeldendeKort);
    lagreSpill();

    document.getElementById("antallKort").textContent =
        samling.length;

    visKort(samling, "samling");

    gjeldendeKort = null;

    melding.textContent = `Du beholdt ${navn}!`;

    visNesteKort();
}

// Viser kortbilder, navn og priser
function visKort(kortListe, elementId) {
    const område = document.getElementById(elementId);

    if (!område) return;

    område.innerHTML = "";

    kortListe.forEach((kort, index) => {
        const boks = document.createElement("article");
        boks.className = "kort";

        const bilde = document.createElement("img");
        bilde.alt = kort.name || "Pokémon-kort";
        bilde.loading = "lazy";

        if (kort.image) {
            bilde.src = `${kort.image}/high.webp`;
            bilde.onerror = () => {
                bilde.onerror = null;
                bilde.src = `${kort.image}/low.webp`;
            };
        }

        const navn = document.createElement("h3");
        navn.textContent = kort.name || "Ukjent kort";

        const sett = document.createElement("p");
        sett.textContent = kort.setNavn || "";

        const sjeldenhet = document.createElement("p");
        sjeldenhet.className = "sjelden";
        sjeldenhet.textContent = kort.rarity || kategori(kort);

        const prisTekst = document.createElement("p");
        prisTekst.className = "markedspris";

        const pris = finnMarkedspris(kort);

        if (pris !== null) {
            prisTekst.textContent = "Markedspris: " + formaterPris(pris);
        } else {
            prisTekst.textContent =
                "Anslått verdi: " + formaterPris(prisForSalg(kort).belop);
        }

        boks.append(bilde, navn, sett, sjeldenhet, prisTekst);

        // Lag en salgsknapp bare for kort i samlingen
        if (elementId === "samling") {
            const selgKnapp = document.createElement("button");
            selgKnapp.textContent = "Selg kortet";
            selgKnapp.className = "selg-samling";

            selgKnapp.onclick = () => {
                const kortPris = prisForSalg(kort);

                poeng += kortPris.belop;

                // Fjern bare dette kortet fra samlingen
                samling.splice(index, 1);

                oppdaterPoeng();
                lagreSpill();

                document.getElementById("antallKort").textContent =
                    samling.length;

                visKort(samling, "samling");

                melding.textContent =
                    `Du solgte ${kort.name} for ${formaterPris(kortPris.belop)}!`;
            };

            boks.appendChild(selgKnapp);
        }

        område.appendChild(boks);
    });
}

// Daglig bonus i spillet: én gang per lagret spill
function hentBonus() {
    if (bonusBrukt) {
        melding.textContent = "Du har allerede hentet bonusen.";
        return;
    }

    poeng += 100;
    bonusBrukt = true;

    oppdaterPoeng();

    const bonusKnapp = document.getElementById("bonusKnapp");

    if (bonusKnapp) {
        bonusKnapp.disabled = true;
    }

    melding.textContent = "Du fikk 100 kr!";
}

// Henter fram lagret saldo og samling når siden åpnes
function lagInnLagretSpill() {
    oppdaterPoeng();

    visKort(samling, "samling");

    document.getElementById("antallKort").textContent =
        samling.length;

    const bonusKnapp = document.getElementById("bonusKnapp");

    if (bonusKnapp) {
        bonusKnapp.disabled = bonusBrukt;
    }

    const valgBoks = document.getElementById("kortValg");

    if (valgBoks) {
        valgBoks.hidden = true;
    }
}

lagInnLagretSpill();
lastInnKort();
