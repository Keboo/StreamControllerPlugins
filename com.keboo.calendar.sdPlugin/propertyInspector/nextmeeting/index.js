/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

/**
 * Property Inspector for Next Meeting action
 */

const $local = false, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    icsUrl: $('#icsUrl'),
    refreshInterval: $('#refreshInterval')
};

const $propEvent = {
    didReceiveSettings(data) {
        // Populate fields with saved settings
        const settings = data.settings || {};
        $dom.icsUrl.value = settings.icsUrl || '';
        $dom.refreshInterval.value = settings.refreshInterval || 5;
    },
    sendToPropertyInspector(data) { }
};

// Save settings when ICS URL changes
$dom.icsUrl.addEventListener('input', $.debounce(function() {
    $settings.icsUrl = $dom.icsUrl.value;
}, 300));

// Save settings when refresh interval changes
$dom.refreshInterval.addEventListener('input', $.debounce(function() {
    let value = parseInt($dom.refreshInterval.value) || 5;
    value = Math.min(60, Math.max(1, value));
    $settings.refreshInterval = value;
}, 300));
