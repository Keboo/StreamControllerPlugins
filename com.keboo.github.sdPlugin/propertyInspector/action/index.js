/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

/**
 * Property Inspector for GitHub Repo action
 */

const $local = false, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    owner: $('#owner'),
    repo: $('#repo')
};

const $propEvent = {
    didReceiveSettings(data) {
        // Populate fields with saved settings
        const settings = data.settings || {};
        $dom.owner.value = settings.owner || '';
        $dom.repo.value = settings.repo || '';
    },
    sendToPropertyInspector(data) { }
};

// Save settings when owner changes
$dom.owner.addEventListener('input', $.debounce(function() {
    $settings.owner = $dom.owner.value;
}, 300));

// Save settings when repo changes
$dom.repo.addEventListener('input', $.debounce(function() {
    $settings.repo = $dom.repo.value;
}, 300));
