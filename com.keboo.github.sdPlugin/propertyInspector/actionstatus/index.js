/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

/**
 * Property Inspector for Action Status action
 * Supports up to 3 workflows with shared owner
 */

const $local = false, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    owner: $('#owner'),
    token: $('#token'),
    refreshInterval: $('#refreshInterval'),
    tokenLink: $('#tokenLink'),
    // Workflow 1
    repo1: $('#repo1'),
    workflow1: $('#workflow1'),
    branch1: $('#branch1'),
    // Workflow 2
    repo2: $('#repo2'),
    workflow2: $('#workflow2'),
    branch2: $('#branch2'),
    // Workflow 3
    repo3: $('#repo3'),
    workflow3: $('#workflow3'),
    branch3: $('#branch3')
};

const $propEvent = {
    didReceiveSettings(data) {
        // Populate fields with saved settings
        const settings = data.settings || {};
        $dom.owner.value = settings.owner || '';
        $dom.token.value = settings.token || '';
        $dom.refreshInterval.value = settings.refreshInterval || 5;
        
        // Workflow 1 - support legacy settings (repo, workflow, branch)
        $dom.repo1.value = settings.repo1 || settings.repo || '';
        $dom.workflow1.value = settings.workflow1 || settings.workflow || '';
        $dom.branch1.value = settings.branch1 || settings.branch || '';
        
        // Workflow 2
        $dom.repo2.value = settings.repo2 || '';
        $dom.workflow2.value = settings.workflow2 || '';
        $dom.branch2.value = settings.branch2 || '';
        
        // Workflow 3
        $dom.repo3.value = settings.repo3 || '';
        $dom.workflow3.value = settings.workflow3 || '';
        $dom.branch3.value = settings.branch3 || '';
    },
    sendToPropertyInspector(data) { }
};

// Helper function to save setting and trigger refresh
function saveSettingAndRefresh(key, value) {
    $settings[key] = value;
    // Send message to plugin to trigger immediate refresh
    $websocket.sendToPlugin({ action: 'refresh' });
}

// Save settings when owner changes
$dom.owner.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('owner', $dom.owner.value);
}, 300));

// Save settings when token changes
$dom.token.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('token', $dom.token.value);
}, 300));

// Save settings when refresh interval changes
$dom.refreshInterval.addEventListener('input', $.debounce(function() {
    let value = parseInt($dom.refreshInterval.value) || 5;
    value = Math.min(60, Math.max(1, value));
    saveSettingAndRefresh('refreshInterval', value);
}, 300));

// Workflow 1 event listeners
$dom.repo1.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('repo1', $dom.repo1.value);
}, 300));

$dom.workflow1.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('workflow1', $dom.workflow1.value);
}, 300));

$dom.branch1.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('branch1', $dom.branch1.value);
}, 300));

// Workflow 2 event listeners
$dom.repo2.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('repo2', $dom.repo2.value);
}, 300));

$dom.workflow2.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('workflow2', $dom.workflow2.value);
}, 300));

$dom.branch2.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('branch2', $dom.branch2.value);
}, 300));

// Workflow 3 event listeners
$dom.repo3.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('repo3', $dom.repo3.value);
}, 300));

$dom.workflow3.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('workflow3', $dom.workflow3.value);
}, 300));

$dom.branch3.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('branch3', $dom.branch3.value);
}, 300));

// Open GitHub PAT settings when token link is clicked
$dom.tokenLink.addEventListener('click', function(e) {
    e.preventDefault();
    $websocket.openUrl('https://github.com/settings/personal-access-tokens');
});
