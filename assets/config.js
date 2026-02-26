const config = {
    siteName: "Simulateur Augmentation",
    baseUrl: "https://example.github.io/simulateur-augmentation/",
    defaultNetRateNonCadre: 0.78,
    defaultNetRateCadre: 0.75,
    defaultEmployerChargesRate: 0.42,
    contactEmail: "contact@exemple.fr"
};

// Export pour usage dans les autres scripts si besoin (bien que vanilla ici)
if (typeof module !== 'undefined') {
    module.exports = config;
}
