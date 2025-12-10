/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

/**
 * Property Inspector for Action Status action
 */

const $local = false, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    owner: $('#owner'),
    repo: $('#repo'),
    workflow: $('#workflow'),
    branch: $('#branch'),
    token: $('#token'),
    refreshInterval: $('#refreshInterval'),
    tokenLink: $('#tokenLink')
};

const $propEvent = {
    didReceiveSettings(data) {
        // Populate fields with saved settings
        const settings = data.settings || {};
        $dom.owner.value = settings.owner || '';
        $dom.repo.value = settings.repo || '';
        $dom.workflow.value = settings.workflow || '';
        $dom.branch.value = settings.branch || '';
        $dom.token.value = settings.token || '';
        $dom.refreshInterval.value = settings.refreshInterval || 5;
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

// Save settings when workflow changes
$dom.workflow.addEventListener('input', $.debounce(function() {
    $settings.workflow = $dom.workflow.value;
}, 300));

// Save settings when branch changes
$dom.branch.addEventListener('input', $.debounce(function() {
    $settings.branch = $dom.branch.value;
}, 300));

// Save settings when token changes
$dom.token.addEventListener('input', $.debounce(function() {
    $settings.token = $dom.token.value;
}, 300));

// Save settings when refresh interval changes
$dom.refreshInterval.addEventListener('input', $.debounce(function() {
    let value = parseInt($dom.refreshInterval.value) || 5;
    value = Math.min(60, Math.max(1, value));
    $settings.refreshInterval = value;
}, 300));

// Open GitHub PAT settings when token link is clicked
$dom.tokenLink.addEventListener('click', function(e) {
    e.preventDefault();
    $websocket.openUrl('https://github.com/settings/personal-access-tokens');
});
