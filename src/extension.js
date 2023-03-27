/*
 * Copyright (C) 2012 Thiago Bellini <hackedbellini@gmail.com>
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Some parts of this code were forked from message-notifier:
 *   https://extensions.gnome.org/extension/150/message-notifier/
 * The idea of setting the menu red were inspired by pidgin-persistent-notification:
 *   https://extensions.gnome.org/extension/170/pidgin-peristent-notification
 *
 */

const { Clutter, St } = imports.gi;
const Mainloop = imports.mainloop;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const GnomeSession = imports.misc.gnomeSession;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;

const SETTING_BLINK_RATE = 'blinkrate';
const SETTING_USECOLOR = 'usecolor';
const SETTING_COLOR = 'color';
const SETTING_USEBACKGROUNDCOLOR = 'usebackgroundcolor';
const SETTING_BACKGROUNDCOLOR = 'backgroundcolor';
const SETTING_CHAT_ONLY = 'chatonly';
const SETTING_FORCE = 'force';
const SETTING_BLACKLIST = 'application-list';
const SETTING_FILTER_TYPE = 'filter';

let settings, messageStyleHandler;
let originalCountUpdated, originalDestroy;

function _MessageStyleHandler() {

  /*
     Public API
  */

  this.init = function() {
    this._signals = {};
    this._statusChangedId = null;
    this._loopTimeoutId = null;
    this._oldStyle = null;
    this._hasStyleAdded = false;

    this._presence = new GnomeSession.Presence(
      (proxy, error) => {
        if (error) {
          logError(error, 'Error while reading gnome-session presence');
          return;
        }
    });
  }

  this.enable = function() {
    this._statusChangedId = this._presence.connectSignal(
      'StatusChanged', (proxy, senderName, [status]) => {
        this._presence.status = status;
        this._onNotificationsSwitchToggled();
    });

    // Connect settings change events, so we can update message style
    // as soon as the user makes the change
    this._connectSetting(SETTING_USECOLOR);
    this._connectSetting(SETTING_COLOR);
    this._connectSetting(SETTING_BACKGROUNDCOLOR);
    this._connectSetting(SETTING_USEBACKGROUNDCOLOR);
    this._connectSetting(SETTING_CHAT_ONLY);
    this._connectSetting(SETTING_FORCE);
    this._connectSetting(SETTING_BLINK_RATE);

    // Check for existing message counters when extension were
    // loaded on an already running shell.
    this.updateMessageStyle();
  }

  this.disable = function() {
    this._presence.disconnectSignal(this._statusChangedId);
    for (let key in this._signals) {
      settings.disconnect(this._signals[key]);
      delete this._signals[key];
    }

    this._removeMessageStyle();
  }

  this.updateMessageStyle = function() {
    this.notificationStatus =
      (this._presence.status != GnomeSession.PresenceStatus.BUSY);
    let sources = Main.messageTray.getSources();

    if (settings.get_boolean(SETTING_FORCE) || this.notificationStatus) {
      let chatOnly = settings.get_boolean(SETTING_CHAT_ONLY);
      let filter = settings.get_int(SETTING_FILTER_TYPE);
      let currentItems = settings.get_strv(SETTING_BLACKLIST);
      currentItems = Lib.getAppNamesFromAppInfos(currentItems);

      for (let i = 0; i < sources.length; i++) {
        let source = sources[i];

        if (chatOnly && !source.isChat) {
          // The user choose to only be alerted by real chat notifications
          continue;
        }
        if (source.isMuted) {
          // Do not alert for muted notifications
          continue;
        }
        if((filter == 0) && (currentItems.indexOf(source.title) != -1)) {
          // Blacklist
          continue;
        }
        if((filter == 1) && (currentItems.indexOf(source.title) == -1)) {
          // Whitelist
          continue;
        }
        if (this._hasNotifications(source)) {
          this._addMessageStyle();
          return;
        }
      }
    }
    // If for above ended without adding the style, that means there's
    // no counter and we need to remove the message style.
    this._removeMessageStyle();
  }

  /*
     Private
  */

  this._connectSetting = function(setting) {
    this._signals[setting] = settings.connect(
      "changed::" + setting, this._onSettingsChanged.bind(this));
  }

  this._hasNotifications = function(source) {
    if (source.countVisible) {
      return true;
    }
    for (let n = 0; n < source.notifications.length; n++) {
      if (!source.notifications[n].resident) {
        return true;
      }
    }
    return false;
  }

  this._toggleStyle = function() {
    if (!this._hasStyleAdded) {
      // Notifications may have been cleared since loop timer was added,
      // return false to stop the timeout. Just a precaution, should not happen
      return false;
    }

    let dateMenu = Main.panel.statusArea.dateMenu;
    let actor = dateMenu instanceof Clutter.Actor ? dateMenu : dateMenu.actor;
    let actualStyle = (actor.style) ? actor.style : "";

    let userStyle = "";
    if (settings.get_boolean(SETTING_USECOLOR)) {
	userStyle += "color: " + settings.get_string(SETTING_COLOR) + ";";
    }
    if (settings.get_boolean(SETTING_USEBACKGROUNDCOLOR)) {
	userStyle += "background-color: " + settings.get_string(SETTING_BACKGROUNDCOLOR) + ";";
    }

    actor.style = (actor.style == this._oldStyle) ?  actualStyle.concat(userStyle) : this._oldStyle;

    // keep looping
    return true;
  }

  this._addMessageStyle = function() {
    if (this._hasStyleAdded) {
      this._removeMessageStyle();
    }

    let dateMenu = Main.panel.statusArea.dateMenu;
    let loopDelay = settings.get_int(SETTING_BLINK_RATE);

    let actor = dateMenu instanceof Clutter.Actor ? dateMenu : dateMenu.actor;
    this._oldStyle = actor.style;
    this._hasStyleAdded = true;

    if (loopDelay > 0) {
      this._loopTimeoutId = Mainloop.timeout_add(
          loopDelay, this._toggleStyle.bind(this))
    } else {
      this._toggleStyle();
    }
  }

  this._removeMessageStyle = function() {
    if (this._loopTimeoutId != null) {
      // Stop the looping
      Mainloop.source_remove(this._loopTimeoutId);
      this._loopTimeoutId = null;
    }
    
    if (!this._hasStyleAdded) {
      return;
    }

    this._hasStyleAdded = false;

    let dateMenu = Main.panel.statusArea.dateMenu;
    let actor = dateMenu instanceof Clutter.Actor ? dateMenu : dateMenu.actor;
    actor.style = this._oldStyle;
    this._oldStyle = null;
  }

  /*
     Callbacks
  */

  this._onSettingsChanged = function() {
    this.updateMessageStyle();
  }

  this._onNotificationsSwitchToggled = function() {
    this.updateMessageStyle();
  }
}

/*
   Monkey-patchs for MessageTray.Source
*/

function _countUpdated() {
  originalCountUpdated.call(this);

  messageStyleHandler.updateMessageStyle();
}

function _destroy() {
  originalDestroy.call(this);

  messageStyleHandler.updateMessageStyle();
}

/*
   Shell-extensions handlers
*/

function init() {
  ExtensionUtils.initTranslations();
}

function enable() {
  settings = ExtensionUtils.getSettings();

  messageStyleHandler = new _MessageStyleHandler();
  messageStyleHandler.init();

  if (MessageTray.Source.prototype.countUpdated == _countUpdated) {
    return;
  }
  originalCountUpdated = MessageTray.Source.prototype.countUpdated;
  originalDestroy = MessageTray.Source.prototype.destroy;

  MessageTray.Source.prototype.countUpdated = _countUpdated;
  MessageTray.Source.prototype.destroy = _destroy;

  messageStyleHandler.enable();
}

function disable() {
  MessageTray.Source.prototype.countUpdated = originalCountUpdated;
  MessageTray.Source.prototype.destroy = originalDestroy;

  messageStyleHandler.disable();

  settings = null;
  messageStyleHandler = null;
  originalCountUpdated = null;
  originalDestroy = null;
}
