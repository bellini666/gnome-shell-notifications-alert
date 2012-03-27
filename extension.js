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
 * Some parts of this code were forked from:
 *   git://git.collabora.co.uk/git/user/bari/shell-message-notifier.git
 * The idea of setting the menu red were inspired by:
 *   https://extensions.gnome.org/extension/170/pidgin-peristent-notification
 *
 */

const Lang = imports.lang;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;

let userMenu, notificationsSwitch, messageStyleHandler;
let originalSetCount, originalDestroy;

function _MessageStyleHandler() {

  this.hasStyleAdded = false;

  /*
     Public API
  */

  this.enable = function() {
    this.notificationsSwitchToggledSignal = notificationsSwitch.connect(
        'toggled', Lang.bind(this, this._onNotificationsSwitchToggled));

    // Check for existing message counters when extension were
    // loaded on an already running shell.
    this.updateMessageStyle();
  }

  this.disable = function() {
    notificationsSwitch.disconnect(this.notificationsSwitchToggledSignal);

    this._removeMessageStyle();
  }

  this.updateMessageStyle = function() {
    let items = Main.messageTray._summaryItems;

    if (notificationsSwitch._switch.state) {
      // Only do this if the user wants to see notifications
      for (let i = 0; i < items.length; i++) {
        let s = items[i].source;
        if (s._counterBin.visible && s._counterLabel.get_text() != '0') {
          // If any source has a counter label different than '0',
          // we will add the style to notify the user.
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

  this._onNotificationsSwitchToggled = function(item, event) {
    this.updateMessageStyle();
  }

  this._addMessageStyle = function() {
    if (this.hasStyleAdded) {
      return;
    }
    userMenu._iconBox.add_style_class_name('has-message-count-style');
    this.hasStyleAdded = true;
  }

  this._removeMessageStyle = function() {
    if (! this.hasStyleAdded) {
      return;
    }
    userMenu._iconBox.remove_style_class_name('has-message-count-style');
    this.hasStyleAdded = false;
  }
}

/*
   Monkey-patchs for MessageTray.Source
*/

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
  originalSetCount = MessageTray.Source.prototype._setCount;
  originalDestroy = MessageTray.Source.prototype.destroy;

  userMenu = Main.panel._statusArea.userMenu;
  notificationsSwitch = userMenu._notificationsSwitch;

  messageStyleHandler = new _MessageStyleHandler();
}

function enable() {
  MessageTray.Source.prototype._setCount = _setCount;
  MessageTray.Source.prototype.destroy = _destroy;

  messageStyleHandler.enable();
}

function disable() {
  MessageTray.Source.prototype._setCount = originalSetCount;
  MessageTray.Source.prototype.destroy = originalDestroy;

  messageStyleHandler.disable();
}
