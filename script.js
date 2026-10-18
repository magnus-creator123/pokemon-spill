const SETT = {
    ASC: { navn: "Ascended Heroes" },
    "30C": { navn: "30th Celebration" },
    BSE: { navn: "Base Set 1st Edition" }
};

const EUR_TIL_NOK = 11.7;
const USD_TIL_NOK = 10.2;
// PriceCharting: ugraderte Base Set 1st Edition-kort
// Prisene her er i amerikanske dollar (USD)
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
    "41": 7, "42": 15,

    "43": 8, "44": 200, "45": 5, "46": 129.98,
    "47": 5, "48": 5, "49": 5, "50": 6,
    "51": 5, "52": 5, "53": 5, "54": 6,
    "55": 5, "56": 6, "57": 10, "58": 190,
    "59": 6, "60": 5, "61": 5, "62": 6,
    "63": 104.07, "64": 5, "65": 5, "66": 5,
    "67": 6, "68": 5, "69": 5,

    "70": 20, "71": 12, "72": 15, "73": 10,
    "74": 25, "75": 12, "76": 20, "77": 12,
    "78": 20, "79": 12, "80": 6, "81": 5,
    "82": 6, "83": 8, "84": 6, "85": 10,
    "86": 8, "87": 5, "88": 10, "89": 8,
    "90": 5, "91": 5, "92": 5, "93": 5,
    "94": 4, "95": 5, "96": 30,

    "97": 5, "98": 5, "99": 5, "100": 5,
    "101": 5, "102": 5
};
let poeng = Number(localStorage.getItem("pokemonSaldo"));
if (!Number.isFinite(poeng) || poeng <= 0) poeng = 1000;

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

        const finnSett = (navn) =>
    settListe.find(s =>
        (s.name || "").toLowerCase().includes(navn)
    );

const funnet = {
    ASC: finnSett("ascended heroes"),
    "30C": finnSett("30th celebration"),
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
    const navn = k => (k.name || "").toLowerCase();
    const rarity = k => (k.rarity || "").toLowerCase();
    const id = k => String(k.localId || "").toUpperCase();

    const erRGB = k =>
        setId === "30C" &&
        navn(k) === "mew" &&
        ["R", "G", "B"].includes(id(k));

    const erHit = k => {
        const r = rarity(k);
        const n = navn(k);

        return erRGB(k) ||
            /\b(ex|vmax|vstar|gx)\b/i.test(n) ||
            r.includes("double rare") ||
            r.includes("ultra rare") ||
            r.includes("illustration rare") ||
            r.includes("special illustration") ||
            r.includes("hyper rare") ||
            r.includes("secret rare") ||
            r.includes("rainbow rare") ||
            r.includes("amazing rare");
    };

    const trygge = kortListe.filter(k => !erHit(k));
    const hits = kortListe.filter(k => erHit(k));
    const rgbHits = hits.filter(k => erRGB(k));
    const andreHits = hits.filter(k => !erRGB(k));

    const velg = liste => liste.length
        ? liste[Math.floor(Math.random() * liste.length)]
        : null;

    // Kort 1–8: Bare kort som ikke er hits
    if (plass <= 8) {
        return velg(trygge) || velg(kortListe);
    }

    // Kort 9–10: RGB Mew er ekstremt sjeldent
    if (rgbHits.length && Math.random() < 0.004) {
        return velg(rgbHits);
    }

    // Andre hits: 1 % på kort 9, 2 % på kort 10
    const hitSjanse = plass === 9 ? 0.50 : 0.80;

    if (andreHits.length && Math.random() < hitSjanse) {
        return velg(andreHits);
    }

    return velg(trygge) || velg(kortListe);
}

function erHit(kort) {
    const navn = (kort.name || "").toLowerCase();
    const rarity = (kort.rarity || "").toLowerCase();

    return /\b(ex|vmax|vstar|gx)\b/i.test(navn) ||
        rarity.includes("double rare") ||
        rarity.includes("ultra rare") ||
        rarity.includes("illustration rare") ||
        rarity.includes("special illustration") ||
        rarity.includes("hyper rare") ||
        rarity.includes("secret rare") ||
        rarity.includes("rainbow rare") ||
        rarity.includes("amazing rare") ||
        rarity.includes("radiant") ||
        rarity.includes("trainer gallery") ||
        rarity.includes("special art");
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

    // Egne markedspriser for RGB Mew
if (
    kort.setId === "30C" &&
    (kort.name || "").toLowerCase() === "mew"
) {
    const id = String(kort.localId || "").toUpperCase();

    const rgbPriserUSD = {
        R: 3213.27,
        G: 3822.74,
        B: 3738.75
    };

    if (Object.prototype.hasOwnProperty.call(rgbPriserUSD, id)) {
        return rgbPriserUSD[id] * USD_TIL_NOK;
    }
}
    const priser = kort.pricing;

    // Base Set 1st Edition: bruk tilgjengelige
    // priser for førsteutgaven hvis de finnes.
    if (kort.setId === "BSE") {
        const tcg = priser?.tcgplayer;

        const varianter = [
            tcg?.["1st-edition-holofoil"],
            tcg?.["1st-edition"],
            tcg?.["1stEditionHolofoil"],
            tcg?.["1stEdition"]
        ];

        for (const variant of varianter) {
            const usd =
                variant?.marketPrice ??
                variant?.midPrice ??
                variant?.market ??
                variant?.mid;

            if (typeof usd === "number" && usd > 0) {
                return usd * USD_TIL_NOK;
            }
        }

        // Bruk bare en gammel reservepris dersom
        // API-et ikke har en oppdatert pris.
        const reservepris = BSE_PRICE_USD[String(kort.localId)];

        if (typeof reservepris === "number") {
            return reservepris * USD_TIL_NOK;
        }

        const rarity = (kort.rarity || "").toLowerCase();

if (rarity.includes("hyper rare")) return 500;
if (rarity.includes("special illustration")) return 300;
if (rarity.includes("illustration rare")) return 100;
if (rarity.includes("ultra rare")) return 75;
if (rarity.includes("double rare")) return 40;
if (rarity.includes("rare")) return 10;
        return null;

    }

    // Behold prislogikken for de andre settene.
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

// Finner salgsverdi uten å finne på en pris
function prisForSalg(kort) {
    const markedspris = finnMarkedspris(kort);

    if (markedspris !== null) {
        return {
            belop: markedspris,
            anslag: false
        };
    }

    // Ikke bruk en falsk standardpris
    return {
        belop: null,
        anslag: true
    };
}

// Åpner en pakke med 10 kort
async function apnePakke(setId) {
    if (pakkeAktiv) return;

    const kortListe = alleKort[setId];
    let detaljer = [];

    if (!kortListe || kortListe.length === 0) {
        melding.textContent = "Kortene er ikke lastet inn ennå.";
        return;
    }

    const pakkePriser = {
        ASC: 200,
        "30C": 200,
        BSE: 500
    };

    const pris = pakkePriser[setId] ?? 200;

    if (poeng < pris) {
        melding.textContent = "Du har ikke nok penger til denne pakken.";
        return;
    }

    poeng -= pris;
    oppdaterPoeng();

    pakkeAktiv = true;
    kortNummer = 0;
    gjeldendeKort = null;
    melding.textContent = "Gjør klar pakken ...";

    try {detaljer = await Promise.all(
    kortListe.map(kort => hentKortDetaljer(kort))
);
        const navn = kort => (kort.name || "").toLowerCase();
const rarity = kort => (kort.rarity || "").toLowerCase();

const erRGBMew = kort =>
    kort.setId === "30C" &&
    navn(kort) === "mew" &&
    ["R", "G", "B"].includes(
        String(kort.localId || "").toUpperCase()
    );

const erHit = kort =>
    erRGBMew(kort) ||
    /\b(ex|vmax|vstar|gx)\b/i.test(navn(kort)) ||
    rarity(kort).includes("double rare") ||
    rarity(kort).includes("ultra rare") ||
    rarity(kort).includes("illustration rare") ||
    rarity(kort).includes("special illustration") ||
    rarity(kort).includes("hyper rare") ||
    rarity(kort).includes("secret rare") ||
    rarity(kort).includes("rainbow rare") ||
    rarity(kort).includes("amazing rare") ||
    rarity(kort).includes("radiant") ||
    rarity(kort).includes("trainer gallery") ||
    rarity(kort).includes("special art");

        const unikeKort = [...new Map(
            detaljer.map(kort => [kort.id, kort])
        ).values()];

        const trygge = unikeKort.filter(kort => !erHit(kort));
        const hits = unikeKort.filter(kort => erHit(kort));
        const rgbHits = hits.filter(kort => erRGBMew(kort));
        const andreHits = hits.filter(kort => !erRGBMew(kort));

        if (trygge.length < 8) {
            throw new Error("Fant ikke nok vanlige kort.");
        }

        const velg = liste =>
            liste[Math.floor(Math.random() * liste.length)];

        const valgte = [];
        const brukteIder = new Set();

        // Kort 1–8: Aldri hits
        for (let i = 0; i < 8; i++) {
            const tilgjengelige = trygge.filter(
                kort => !brukteIder.has(kort.id)
            );

            const kort = velg(tilgjengelige);
            valgte.push(kort);
            brukteIder.add(kort.id);
        }

        // Kort 9–10: Vanlige kort eller hits
        for (let plass = 9; plass <= 10; plass++) {
            const tilgjengeligeVanlige = trygge.filter(
                kort => !brukteIder.has(kort.id)
            );

            const tilgjengeligeHits = andreHits.filter(
                kort => !brukteIder.has(kort.id)
            );

            const tilgjengeligeRGB = rgbHits.filter(
                kort => !brukteIder.has(kort.id)
            );

            let valgt;

            if (tilgjengeligeRGB.length && Math.random() < 0.004) {
                valgt = velg(tilgjengeligeRGB);
            } else {
                const hitSjanse = plass === 9 ? 0.30 : 0.40;

                if (
                    tilgjengeligeHits.length &&
                    Math.random() < hitSjanse
                ) {
                    valgt = velg(tilgjengeligeHits);
                } else if (tilgjengeligeVanlige.length) {
                    valgt = velg(tilgjengeligeVanlige);
                } else {
                    valgt = velg(tilgjengeligeHits);
                }
            }

            if (!valgt) {
                throw new Error("Fant ikke nok kort til pakken.");
            }

            valgte.push(valgt);
            brukteIder.add(valgt.id);
        }

        kortSomSkalVelges = valgte;
        visNesteKort();

    } catch (feil) {
        console.error(feil);
        poeng += pris;
        oppdaterPoeng();
        pakkeAktiv = false;
        melding.textContent =
            "Kunne ikke lage pakken. Pengene er tilbakeført.";
    }
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

if (pris.belop === null) {
    melding.textContent =
        "Dette kortet mangler en markedspris og kan ikke selges ennå.";
    return;
}

poeng += pris.belop;
    oppdaterPoeng();

    melding.textContent =
        `Du solgte ${kort.name} for ${formaterPris(pris.belop)}` +
        (pris.anslag ? " (anslått pris)!" : "!");

    gjeldendeKort = null;
    visNesteKort();
}

function selgFraSamling(indeks) {
    const kort = samling[indeks];
    if (!kort) return;

    const pris = prisForSalg(kort);

    if (pris.belop === null) {
        melding.textContent =
            "Dette kortet mangler en markedspris og kan ikke selges.";
        return;
    }

    poeng += pris.belop;

    samling.splice(indeks, 1);

    oppdaterPoeng();
    visKort(samling, "samling");

    document.getElementById("antallKort").textContent =
        samling.length;

    melding.textContent =
        `Du solgte ${kort.name} for ${formaterPris(pris.belop)}!`;
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

function visKort(kortListe, elementId) {
    const område = document.getElementById(elementId);
    if (!område) return;

    område.innerHTML = "";

    kortListe.forEach((kort, indeks) => {
        const kortBoks = document.createElement("div");
        kortBoks.className = "kort";

        const bilde = document.createElement("img");
        bilde.alt = kort.name || "Pokémon-kort";
        bilde.loading = "lazy";

        const kortNavn = (kort.name || "").toLowerCase();

        const mewFarge = String(kort.localId || "").toUpperCase();

if (
    kort.setId === "30C" &&
    kortNavn === "mew" &&
    ["R", "G", "B"].includes(mewFarge)
) {
    const mewBilder = {
        B: "Bilder/mew-blå.jpg",
        G: "Bilder/mew-grønn.webp",
        R: "Bilder/mew-rød.jpg"
    };

    bilde.src = mewBilder[mewFarge];
} else if (kort.image) {
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

        const prisTekst = document.createElement("p");
        const pris = finnMarkedspris(kort);

        prisTekst.textContent = pris !== null
            ? "Pris: " + formaterPris(pris)
            : "Pris: Ikke tilgjengelig";

        kortBoks.appendChild(bilde);
        kortBoks.appendChild(navn);
        kortBoks.appendChild(sett);
        kortBoks.appendChild(prisTekst);

        // Bare kort i samlingen får egen salgsknapp
        if (elementId === "samling") {
            const selgKnapp = document.createElement("button");
            selgKnapp.textContent = pris !== null
                ? "Selg for " + formaterPris(pris)
                : "Kan ikke selges";

            selgKnapp.disabled = pris === null;

            selgKnapp.addEventListener("click", () => {
                selgFraSamling(indeks);
            });

            kortBoks.appendChild(selgKnapp);

            
        }

        område.appendChild(kortBoks);
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