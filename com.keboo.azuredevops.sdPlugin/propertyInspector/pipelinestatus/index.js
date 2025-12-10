/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

/**
 * Property Inspector for Azure DevOps Pipeline Status action
 * Supports up to 3 pipelines with shared organization and project
 */

const $local = false, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    organization: $('#organization'),
    project: $('#project'),
    token: $('#token'),
    refreshInterval: $('#refreshInterval'),
    tokenLink: $('#tokenLink'),
    // Pipeline 1
    pipeline1: $('#pipeline1'),
    branch1: $('#branch1'),
    // Pipeline 2
    pipeline2: $('#pipeline2'),
    branch2: $('#branch2'),
    // Pipeline 3
    pipeline3: $('#pipeline3'),
    branch3: $('#branch3')
};

const $propEvent = {
    didReceiveSettings(data) {
        // Populate fields with saved settings
        const settings = data.settings || {};
        $dom.organization.value = settings.organization || '';
        $dom.project.value = settings.project || '';
        $dom.token.value = settings.token || '';
        $dom.refreshInterval.value = settings.refreshInterval || 5;
        
        // Pipeline 1
        $dom.pipeline1.value = settings.pipeline1 || '';
        $dom.branch1.value = settings.branch1 || '';
        
        // Pipeline 2
        $dom.pipeline2.value = settings.pipeline2 || '';
        $dom.branch2.value = settings.branch2 || '';
        
        // Pipeline 3
        $dom.pipeline3.value = settings.pipeline3 || '';
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

// Save settings when organization changes
$dom.organization.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('organization', $dom.organization.value);
}, 300));

// Save settings when project changes
$dom.project.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('project', $dom.project.value);
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

// Pipeline 1 event listeners
$dom.pipeline1.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('pipeline1', $dom.pipeline1.value);
}, 300));

$dom.branch1.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('branch1', $dom.branch1.value);
}, 300));

// Pipeline 2 event listeners
$dom.pipeline2.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('pipeline2', $dom.pipeline2.value);
}, 300));

$dom.branch2.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('branch2', $dom.branch2.value);
}, 300));

// Pipeline 3 event listeners
$dom.pipeline3.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('pipeline3', $dom.pipeline3.value);
}, 300));

$dom.branch3.addEventListener('input', $.debounce(function() {
    saveSettingAndRefresh('branch3', $dom.branch3.value);
}, 300));

// Open Azure DevOps PAT settings when token link is clicked
$dom.tokenLink.addEventListener('click', function(e) {
    e.preventDefault();
    $websocket.openUrl('https://dev.azure.com/_usersSettings/tokens');
});
