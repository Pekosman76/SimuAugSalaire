document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('simulator-form');
    const resultsDiv = document.getElementById('results');
    const profilSelect = document.getElementById('profil');
    const customRateGroup = document.getElementById('custom-rate-group');
    const cookieBanner = document.getElementById('cookie-banner');
    const acceptCookiesBtn = document.getElementById('accept-cookies');

    // Gestion du bandeau cookies
    if (!localStorage.getItem('cookies-accepted')) {
        cookieBanner.classList.remove('hidden');
    }

    acceptCookiesBtn.addEventListener('click', () => {
        localStorage.setItem('cookies-accepted', 'true');
        cookieBanner.classList.add('hidden');
    });

    // Affichage du taux personnalisé
    profilSelect.addEventListener('change', () => {
        if (profilSelect.value === 'custom') {
            customRateGroup.classList.remove('hidden');
        } else {
            customRateGroup.classList.add('hidden');
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    function calculate() {
        const brutActuel = parseFloat(document.getElementById('brut-actuel').value);
        const profil = profilSelect.value;
        const targetNetGain = parseFloat(document.getElementById('target-net').value);
        const taxRate = parseFloat(document.getElementById('tax-rate').value || 0) / 100;
        const employerChargesRate = parseFloat(document.getElementById('employer-rate').value || config.defaultEmployerChargesRate) / 100;

        let netRate = config.defaultNetRateNonCadre;
        if (profil === 'cadre') netRate = config.defaultNetRateCadre;
        if (profil === 'custom') netRate = parseFloat(document.getElementById('custom-net-rate').value);

        if (isNaN(brutActuel) || isNaN(targetNetGain) || isNaN(netRate)) {
            alert("Veuillez remplir tous les champs obligatoires avec des valeurs valides.");
            return;
        }

        // Calculs
        // net_apres_impot = brut * netRate * (1 - taxRate)
        // brut_increase = targetNetGain / (netRate * (1 - taxRate))
        
        const divisor = netRate * (1 - taxRate);
        const brutIncrease = targetNetGain / divisor;
        const percentIncrease = (brutIncrease / brutActuel) * 100;
        const nouveauBrut = brutActuel + brutIncrease;
        
        const gainNetAnnuel = targetNetGain * 12;
        const surcoutEmployeurMensuel = brutIncrease * (1 + employerChargesRate);
        const surcoutEmployeurAnnuel = surcoutEmployeurMensuel * 12;

        // Affichage
        document.getElementById('res-percent').textContent = percentIncrease.toFixed(2) + ' %';
        document.getElementById('res-brut-mensuel').textContent = formatEuro(nouveauBrut);
        document.getElementById('res-net-mensuel').textContent = formatEuro(targetNetGain);
        document.getElementById('res-net-annuel').textContent = formatEuro(gainNetAnnuel);
        document.getElementById('res-employeur-mensuel').textContent = formatEuro(surcoutEmployeurMensuel);
        document.getElementById('res-employeur-annuel').textContent = formatEuro(surcoutEmployeurAnnuel);

        const negoText = `Bonjour, pour atteindre mon objectif de +${targetNetGain}€ net par mois après impôts, je souhaiterais discuter d'une revalorisation de mon salaire brut à ${formatEuro(nouveauBrut)}, soit une augmentation de ${percentIncrease.toFixed(2)}%.`;
        document.getElementById('nego-text').textContent = negoText;

        resultsDiv.style.display = 'block';
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
    }

    window.copyResult = function() {
        const text = document.getElementById('nego-text').textContent;
        navigator.clipboard.writeText(text).then(() => {
            alert("Texte copié !");
        });
    };

    function formatEuro(val) {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
    }
});
