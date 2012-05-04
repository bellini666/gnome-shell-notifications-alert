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

const Lang = imports.lang;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;

const SETTING_CHAT_ONLY = 'chatonly';
const SETTING_FORCE = 'force';
const STYLE_CLASS = 'has-message-count-style';

let settings, messageStyleHandler;
let originalPushNotification, originalSetCount, originalDestroy;

function _MessageStyleHandler() {

  /*
     Public API
  */

  this.enable = function() {
    let notificationsSwitch = Main.panel._statusArea.userMenu._notificationsSwitch;
    this.notificationsSwitchToggledSignal = notificationsSwitch.connect(
        'toggled', Lang.bind(this, this._onNotificationsSwitchToggled));

    // Connect settings change events, so we can update message style
    // as soon as the user makes the change
    settings.connect("changed::" + SETTING_CHAT_ONLY,
                     Lang.bind(this, this._onSettingsChanged));
    settings.connect("changed::" + SETTING_FORCE,
                     Lang.bind(this, this._onSettingsChanged));

    // Check for existing message counters when extension were
    // loaded on an already running shell.
    this.updateMessageStyle();
  }

  this.disable = function() {
    let notificationsSwitch = Main.panel._statusArea.userMenu._notificationsSwitch;
    notificationsSwitch.disconnect(this.notificationsSwitchToggledSignal);

    this._removeMessageStyle();
  }

  this.updateMessageStyle = function() {
    let notificationsSwitch = Main.panel._statusArea.userMenu._notificationsSwitch;
    let items = Main.messageTray._summaryItems;

    if (settings.get_boolean(SETTING_FORCE) ||
        notificationsSwitch._switch.state) {
      let chatOnly = settings.get_boolean(SETTING_CHAT_ONLY);

      for (let i = 0; i < items.length; i++) {
        let source = items[i].source;

        if (chatOnly && !source.isChat) {
          // The user choose to only be alerted by real chat notifications
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

  this._hasNotifications = function(source) {
    if (source._counterBin.visible &&
        source._counterLabel.get_text() != '0') {
      return true;
    }
    for (let n = 0; n < source.notifications.length; n++) {
      if (!source.notifications[n].resident) {
        // Do not alert resident notifications (like Rhythmbox ones)
        return true;
      }
    }
    return false;
  }

  this._addMessageStyle = function() {
    let userMenu = Main.panel._statusArea.userMenu;
    if (userMenu._iconBox.has_style_class_name(STYLE_CLASS)) {
      return;
    }

    userMenu._iconBox.add_style_class_name(STYLE_CLASS);
  }

  this._removeMessageStyle = function() {
    let userMenu = Main.panel._statusArea.userMenu;
    if (!userMenu._iconBox.has_style_class_name(STYLE_CLASS)) {
      return;
    }

    userMenu._iconBox.remove_style_class_name(STYLE_CLASS);
  }

  /*
     Callbacks
  */

  this._onSettingsChanged = function() {
    this.updateMessageStyle();
  }

  this._onNotificationsSwitchToggled = function(item, event) {
    this.updateMessageStyle();
  }
}

/*
   Monkey-patchs for MessageTray.Source
*/

function _pushNotification(notification) {
  originalPushNotification.call(this, notification);

  messageStyleHandler.updateMessageStyle();
}

function _setCount(count, visible) {
  originalSetCount.call(this, count, visible);

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
  Lib.initTranslations(Me);
  settings = Lib.getSettings(Me);
}

function enable() {
  messageStyleHandler = new _MessageStyleHandler();

  originalPushNotification = MessageTray.Source.prototype.pushNotification;
  originalSetCount = MessageTray.Source.prototype._setCount;
  originalDestroy = MessageTray.Source.prototype.destroy;

  MessageTray.Source.prototype.pushNotification = _pushNotification;
  MessageTray.Source.prototype._setCount = _setCount;
  MessageTray.Source.prototype.destroy = _destroy;

  messageStyleHandler.enable();
}

function disable() {
  MessageTray.Source.prototype.pushNotification = originalPushNotification;
  MessageTray.Source.prototype._setCount = originalSetCount;
  MessageTray.Source.prototype.destroy = originalDestroy;

  messageStyleHandler.disable();
}
