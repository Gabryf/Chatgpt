(function () {
  'use strict';
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const icon = (name, size = 18) => {
    const paths = {
      chat: '<path d="M4 4h16v12H9l-5 4Z"/><path d="M8 8h8M8 12h5"/>',
      calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16M8 14h2m4 0h2"/>',
      bell: '<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 20h4"/>',
      people: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3m1-15a3 3 0 0 1 0 6m3 9v-3a5 5 0 0 0-3-4"/>',
      call: '<path d="m7 3-4 2c0 8 8 16 16 16l2-4-5-3-2 2c-3-1-5-3-6-6l2-2Z"/>',
      video: '<rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 6-3v10l-6-3"/>',
      more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
      attach: '<path d="m8 14 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9"/>',
      smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4 4 0 0 0 8 0M8 9h.1m7.9 0h.1"/>',
      send: '<path d="m3 3 19 9-19 9 4-9Zm4 9h15"/>',
      delete: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
      archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8M9 12h6"/>',
      reply: '<path d="m9 5-6 6 6 6M3 11h9c5 0 8 3 8 8"/>',
      forward: '<path d="m15 5 6 6-6 6M21 11h-9c-5 0-8 3-8 8"/>',
      settings: '<path d="m9 3-.6 3-2 .8L4 6l-2 4 2.5 1.8v2.4L2 16l2 4 2.4-.8 2 .8.6 3h6l.6-3 2-.8 2.4.8 2-4-2.5-1.8v-2.4L22 10l-2-4-2.4.8-2-.8L15 3Z"/><circle cx="12" cy="13" r="3"/>',
      launcher: '<circle cx="5" cy="5" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="19" cy="5" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="19" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="19" cy="19" r="1"/>'
    };
    return paths[name] ? '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>' : window.CyberIcons(name, size);
  };

  // Content slots contain the fixed educational markup supplied by each game.
  function teams(options) {
    const title = options.title || 'Project coordination';
    const chats = options.chats || [{name:title,initials:options.initials || 'PC',preview:'Recent messages',active:true},{name:'Project team',initials:'PT',preview:'Weekly update'},{name:'IT Service Desk',initials:'IT',preview:'Security newsletter'}];
    return '<section class="sim-teams" data-simulation="teams" aria-label="Simulated Microsoft Teams chat">' +
      '<header class="sim-teams-bar"><img class="sim-teams-logo" src="assets/teams-logo.png" alt="Microsoft Teams" width="28" height="28"><strong>Microsoft Teams</strong><span class="sim-teams-search">' + icon('search',16) + '<span>Search</span></span><span class="sim-teams-top-tools">' + icon('more') + '<span class="sim-teams-profile">GB</span></span></header>' +
      '<div class="sim-teams-workspace"><aside class="sim-teams-rail" aria-label="Simulated Teams apps">' + [['bell','Activity'],['chat','Chat'],['people','Teams'],['calendar','Calendar'],['call','Calls'],['file','Files']].map(item => '<span class="' + (item[1] === 'Chat' ? 'sim-teams-app-active' : '') + '">' + icon(item[0],20) + '<small>' + item[1] + '</small></span>').join('') + '</aside>' +
      '<aside class="sim-teams-chats" aria-label="Simulated recent chats"><div class="sim-teams-chats-title"><strong>Chat</strong>' + icon('more') + '</div><div class="sim-teams-chat-filters"><span>Unread</span><span>Chats</span><span>Channels</span></div><p class="sim-teams-recents">Recent</p>' + chats.map(chat => '<div class="sim-teams-chat-row ' + (chat.active ? 'sim-teams-chat-active' : '') + '"><span class="sim-teams-chat-avatar">' + escape(chat.initials || chat.name.slice(0,2)) + '</span><div><strong>' + escape(chat.name) + '</strong><small>' + escape(chat.preview || '') + '</small></div></div>').join('') + '</aside>' +
      '<div class="sim-teams-conversation"><div class="sim-teams-chat-header"><span class="sim-teams-contact-avatar">' + escape(options.initials || 'PC') + '</span><div><strong>' + escape(title) + '</strong>' + (options.subtitle ? '<small>' + escape(options.subtitle) + '</small>' : '') + '</div><span class="sim-teams-call-tools">' + icon('video') + icon('call') + icon('more') + '</span></div><div class="sim-teams-chat-tabs"><span>Chat</span><span>Shared</span><span>Notes</span><span class="sim-teams-simulation">SIMULATION</span></div><div class="sim-teams-feed"><div class="sim-teams-date">Today</div>' + options.content + '</div><div class="sim-teams-composer"><span>Type a message</span><div>' + icon('smile') + icon('attach') + icon('send') + '</div></div></div></div></section>';
  }

  function teamsMessage(options) {
    return '<div class="sim-teams-message"><span class="sim-teams-message-avatar" aria-hidden="true">' + escape(options.initials || 'MK') + '</span><div class="sim-teams-message-column"><div class="sim-teams-message-meta"><strong>' + escape(options.sender) + '</strong>' + (options.external ? '<span class="sim-teams-external">External</span>' : '') + '<time>' + escape(options.time || '09:41') + '</time></div><div class="sim-teams-bubble">' + options.body + '</div></div></div>';
  }

  function microsoftBrand() {
    return '<div class="det-microsoft-lockup"><img class="det-microsoft-logo" src="assets/microsoft-logo.svg" alt="Microsoft" width="24" height="24"><span aria-hidden="true">Microsoft</span></div>';
  }

  function attachment(options) {
    return '<div class="sim-mail-attachment">' + icon('file',26) + '<div><strong>' + escape(options.filename) + '</strong><small>' + escape(options.detail || '') + '</small></div></div>';
  }

  function outlook(options) {
    const subject = escape(options.subject);
    const sender = escape(options.senderName || 'Microsoft 365');
    const selectedTime = escape((String(options.date || 'Today, 10:24').match(/\d{1,2}:\d{2}/) || [options.date || '10:24'])[0]);
    const header = options.headerHTML != null ? options.headerHTML : '<div class="det-email-header"><span class="det-mail-avatar" aria-hidden="true">' + sender.slice(0,1) + '</span><div class="det-email-sender"><strong>' + sender + '</strong><span class="det-email-address">' + escape(options.from || '') + '</span><span>To: ' + escape(options.recipient || 'you@sunrise.example') + '</span></div><span class="det-email-date">' + escape(options.date || 'Today, 10:24') + '</span></div>';
    return '<section class="det-outlook sim-outlook" data-simulation="outlook" aria-label="Simulated Outlook inbox">' +
      '<header class="det-outlook-bar"><span class="det-launcher">' + icon('launcher') + '</span><img class="det-outlook-logo" src="assets/outlook-logo.png" alt="Outlook" width="30" height="30"><strong>Outlook</strong><span class="det-mail-search">' + icon('search',16) + '<span>Search</span></span><span class="det-outlook-header-tools">' + icon('settings') + icon('help') + '<span class="det-account-avatar">GB</span></span></header>' +
      '<div class="det-outlook-tabs"><span class="det-outlook-tab-active">Home</span><span>View</span><span>Help</span><span class="det-simulation">SIMULATION</span></div><div class="det-outlook-toolbar" aria-label="Simulated Outlook toolbar"><span class="det-new-mail">' + icon('mail',17) + ' New mail</span><span>' + icon('delete') + '<span>Delete</span></span><span>' + icon('archive') + '<span>Archive</span></span><span>' + icon('flag') + '<span>Report</span></span><i class="det-toolbar-divider"></i><span>' + icon('reply') + '<span>Reply</span></span><span>' + icon('forward') + '<span>Forward</span></span><span class="det-toolbar-more">' + icon('more') + '</span></div>' +
      '<div class="det-mail-layout"><aside class="det-outlook-rail" aria-label="Simulated Microsoft 365 apps"><span class="det-outlook-rail-active">' + icon('mail',20) + '</span><span>' + icon('calendar') + '</span><span>' + icon('user',20) + '</span><span>' + icon('file',20) + '</span></aside><aside class="det-mail-sidebar" aria-label="Simulated mail folders"><span class="det-folder-heading">Favourites</span><span class="det-mail-folder det-mail-folder-active">' + icon('mail') + '<span>Inbox</span><b>4</b></span><span class="det-mail-folder">' + icon('forward') + '<span>Sent Items</span></span><span class="det-mail-folder">' + icon('file') + '<span>Drafts</span><b>1</b></span><span class="det-mail-folder">' + icon('delete') + '<span>Deleted Items</span></span><span class="det-folder-heading">Folders</span><span class="det-mail-folder">' + icon('archive') + '<span>Archive</span></span></aside><section class="det-mail-list" aria-label="Simulated inbox messages"><div class="det-mail-list-heading"><strong>Inbox</strong>' + icon('more') + '</div><div class="det-mail-list-tabs"><span class="det-focused-tab">Focused</span><span>Other</span></div><div class="det-mail-preview selected"><span><b>' + sender + '</b><time>' + selectedTime + '</time></span><strong>' + subject + '</strong><small>New message</small></div><div class="det-mail-preview"><span><b>Laura Bennett</b><time>Yesterday</time></span><strong>Updated meeting invitation</strong><small>Our check-in is now at 14:30.</small></div><div class="det-mail-preview"><span><b>Project team</b><time>Monday</time></span><strong>Weekly update</strong><small>The latest slides are in SharePoint.</small></div></section><article class="det-mail-body"><h3>' + subject + '</h3>' + header + '<div class="det-email-text">' + options.body + '</div><div class="det-mail-simulation-note">Fictional message. No external links are active.</div></article></div></section>';
  }
  window.CyberScreens = {teams,teamsMessage,outlook,microsoftBrand,attachment};
})();
