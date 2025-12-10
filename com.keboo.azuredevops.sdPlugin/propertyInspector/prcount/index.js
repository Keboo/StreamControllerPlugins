/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

/**
 * Property Inspector for Azure DevOps PR Count action
 */

const $local = false, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    organization: $('#organization'),
    project: $('#project'),
    token: $('#token'),
    refreshInterval: $('#refreshInterval'),
    excludeUsers: $('#excludeUsers'),
    includeDrafts: $('#includeDrafts'),
    tokenLink: $('#tokenLink')
};

const $propEvent = {
    didReceiveSettings(data) {
        // Populate fields with saved settings
        const settings = data.settings || {};
        $dom.organization.value = settings.organization || '';
        $dom.project.value = settings.project || '';
        $dom.token.value = settings.token || '';
        $dom.refreshInterval.value = settings.refreshInterval || 5;
        $dom.excludeUsers.value = settings.excludeUsers || '';
        $dom.includeDrafts.checked = settings.includeDrafts || false;
    },
    sendToPropertyInspector(data) { }
};

// Save settings when organization changes
$dom.organization.addEventListener('input', $.debounce(function() {
    $settings.organization = $dom.organization.value;
}, 300));

// Save settings when project changes
$dom.project.addEventListener('input', $.debounce(function() {
    $settings.project = $dom.project.value;
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

// Save settings when exclude users changes
$dom.excludeUsers.addEventListener('input', $.debounce(function() {
    $settings.excludeUsers = $dom.excludeUsers.value;
}, 300));

// Save settings when include drafts changes
$dom.includeDrafts.addEventListener('change', function() {
    $settings.includeDrafts = $dom.includeDrafts.checked;
});

// Open Azure DevOps PAT settings when token link is clicked
$dom.tokenLink.addEventListener('click', function(e) {
    e.preventDefault();
    // Open Azure DevOps personal access tokens page
    // Users need to replace {org} with their organization
    $websocket.openUrl('https://dev.azure.com/_usersSettings/tokens');
});
