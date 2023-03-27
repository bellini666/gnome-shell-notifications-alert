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
 * Most of this code was forked from media-player-indicator:
 *   https://extensions.gnome.org/extension/55/media-player-indicator/
 *
 */

const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const Gettext = imports.gettext.domain('gnome-shell-notifications-alert');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;

const SETTING_BLACKLIST = 'application-list';
const SETTING_FILTER_TYPE = 'filter';

const Columns = {
  APPINFO: 0,
  DISPLAY_NAME: 1,
  ICON: 2,
};

function _createFilterListSetting() {
  let settingLabel = new Gtk.Label({label: _("Filter List"), xalign: 0});
  let widget = new Widget();
  let blbox = new Gtk.Grid({column_spacing: 5, row_spacing: 5});
  blbox.attach(settingLabel,0,0,1,1);
  blbox.attach(widget,0,1,1,1);
  return blbox;
}

/*
   Blacklist widget
*/
const Widget = new GObject.Class({
  Name: 'NotificationsAlert.Prefs.BlackListWidget',
  GTypeName: 'NotificationsAlertBlackListPrefsWidget',
  Extends: Gtk.Box,

  _init: function(params) {
    this.parent(params);
    this.set_orientation(Gtk.Orientation.VERTICAL);

    ExtensionUtils.initTranslations();
    this._settings = ExtensionUtils.getSettings();

    this._store = new Gtk.ListStore();
    this._store.set_column_types([Gio.AppInfo, GObject.TYPE_STRING, Gio.Icon]);

    let scrolled = new Gtk.ScrolledWindow();
    scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
    scrolled.set_min_content_height(150);
    this.append(scrolled);

    this._treeView = new Gtk.TreeView({ model: this._store,
                                        hexpand: true, vexpand: true });
    this._treeView.get_selection().set_mode(Gtk.SelectionMode.SINGLE);

    let appColumn = new Gtk.TreeViewColumn({ expand: true, sort_column_id: Columns.DISPLAY_NAME,
                                             title: _("Application") });
    let iconRenderer = new Gtk.CellRendererPixbuf;
    appColumn.pack_start(iconRenderer, false);
    appColumn.add_attribute(iconRenderer, "gicon", Columns.ICON);
    let nameRenderer = new Gtk.CellRendererText;
    appColumn.pack_start(nameRenderer, true);
    appColumn.add_attribute(nameRenderer, "text", Columns.DISPLAY_NAME);
    this._treeView.append_column(appColumn);

    scrolled.set_child(this._treeView);

    let toolbar = new Gtk.Box();
    toolbar.get_style_context().add_class("toolbar");
    this.append(toolbar);

    let newButton = new Gtk.Button({ icon_name: 'bookmark-new-symbolic',
                                     label: _("Add Rule") });
    newButton.connect('clicked', this._createNew.bind(this));
    toolbar.append(newButton);

    let delButton = new Gtk.Button({ icon_name: 'edit-delete-symbolic' });
      delButton.connect('clicked', this._deleteSelected.bind(this));
      toolbar.append(delButton);

    this._changedPermitted = true;
    this._refresh();
  },

  _createNew: function() {
    let dialog = new Gtk.Dialog({ title: _("Blacklist app"),
                                  transient_for: this.get_root(),
                                  use_header_bar: true,
                                  modal: true });
    dialog.add_button("_Cancel", Gtk.ResponseType.CANCEL);
    let addButton = dialog.add_button(_("Add"), Gtk.ResponseType.OK);
    dialog.set_default_response(Gtk.ResponseType.OK);

    dialog._appChooser = new Gtk.AppChooserWidget({ show_all: true });

    let lbl = new Gtk.Label({label: _("Choose an application to blacklist:"),
                             xalign: 0.5, margin_bottom: 5});
    let hbox = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, hexpand: true,
                            margin_top: 10, margin_bottom: 10, margin_start: 10, margin_end: 10});
    hbox.append(lbl);
    hbox.append(dialog._appChooser);
    dialog.get_content_area().append(hbox);

    dialog.connect('response', function(dialog, id) {
      if (id != Gtk.ResponseType.OK) {
        dialog.destroy();
        return;
      }

      let appInfo = dialog._appChooser.get_app_info();
      if (!appInfo) return;

      if (this._checkId( appInfo.get_id())){
        dialog.destroy();
        return;
      }

      this._changedPermitted = false;
      this._appendItem(appInfo.get_id());
      this._changedPermitted = true;

      let iter = this._store.append();

      this._store.set(iter,
        [Columns.APPINFO, Columns.ICON, Columns.DISPLAY_NAME],
        [appInfo, appInfo.get_icon(), appInfo.get_display_name()]);

      dialog.destroy();
      }.bind(this));

    dialog.show();
  },

  _deleteSelected: function() {
    let [any, model, iter] = this._treeView.get_selection().get_selected();

    if (any) {
      let appInfo = this._store.get_value(iter, Columns.APPINFO);

      this._changedPermitted = false;
      this._removeItem(appInfo.get_id());
      this._changedPermitted = true;
      this._store.remove(iter);
    }
  },

  _refresh: function() {
    if (!this._changedPermitted)
        // Ignore this notification, model is being modified outside
        return;

    this._store.clear();

    let currentItems = this._settings.get_strv(SETTING_BLACKLIST);
    let validItems = [ ];
    for (let i = 0; i < currentItems.length; i++) {
      let id = currentItems[i];
      let appInfo = Gio.DesktopAppInfo.new(id);
      if (!appInfo)
        continue;
      validItems.push(currentItems[i]);

      let iter = this._store.append();
      this._store.set(iter,
          [Columns.APPINFO, Columns.ICON, Columns.DISPLAY_NAME],
          [appInfo, appInfo.get_icon(), appInfo.get_display_name()]);
    }

    if (validItems.length != currentItems.length) // some items were filtered out
        this._settings.set_strv(SETTING_BLACKLIST, validItems);
  },

  _checkId: function(id) {
    let items = this._settings.get_strv(SETTING_BLACKLIST);
    return (items.indexOf(id) != -1);
  },

  _appendItem: function(id) {
    let currentItems = this._settings.get_strv(SETTING_BLACKLIST);
    currentItems.push(id);
    this._settings.set_strv(SETTING_BLACKLIST, currentItems);
  },

  _removeItem: function(id) {
    let currentItems = this._settings.get_strv(SETTING_BLACKLIST);
    let index = currentItems.indexOf(id);

    if (index < 0)
      return;
    currentItems.splice(index, 1);
    this._settings.set_strv(SETTING_BLACKLIST, currentItems);
  }
});

/**
 * PrefsWidget
 */
const PrefsWidget = GObject.registerClass({
  GTypeName: 'PrefsWidget',
  Template: Me.dir.get_child('prefs.ui').get_uri(),
  InternalChildren: [
    'font_color',
    'background_color',
    'use_font_color',
    'use_background_color',
    'chat_only',
    'force_alerting',
    'blink_rate',
    'filter_type',
    'filter_box',
  ],
}, class PrefsWidget extends Gtk.Box {

  _init(params = {}) {
    super._init(params);
    this._settings = ExtensionUtils.getSettings();

    // color settings
    this._connectColorSettings('color', 'font_color', 'notify::rgba');
    this._connectColorSettings('backgroundcolor', 'background_color', 'notify::rgba');

    // boolean settings
    this._bindSettings('usecolor', 'use_font_color', 'active');
    this._bindSettings('usebackgroundcolor', 'use_background_color', 'active');
    this._bindSettings('chatonly', 'chat_only', 'active');
    this._bindSettings('force', 'force_alerting', 'active');

    // int setting
    this._bindSettings('blinkrate', 'blink_rate', 'value');

    // filter type setting
    this._widget('filter_type').set_active(this._settings.get_int('filter'));
    this._widget('filter_type').connect('changed', comboBox => {
      this._settings.set_int('filter', comboBox.get_active());
    });

    // filter list
    this._widget('filter_box').append(_createFilterListSetting());
  }

  _widget(id) {
    const name = '_' + id;
    if (!this[name]) {
        throw `Unknown widget with ID "${id}"!`;
    }
    return this[name];
  }

  _connectColorSettings(settingsKey, widgetId, signal) {
    this._widget(widgetId).set_rgba(Lib.getRGBAColor(this._settings.get_string(settingsKey)));
    this._widget(widgetId).connect(signal, button => {
      let rgba = button.get_rgba().to_string();
      this._settings.set_string(settingsKey, rgba);
    });
  }

  _bindSettings(settingsKey, widgetId, widgetProperty, flag = Gio.SettingsBindFlags.DEFAULT) {
      const widget = this._widget(widgetId);
      this._settings.bind(settingsKey, widget, widgetProperty, flag);
      this._settings.bind_writable(settingsKey, widget, 'sensitive', false);
  }
});


/**
 * Shell-extensions handlers
 */

function init() {
  ExtensionUtils.initTranslations('gnome-shell-notifications-alert');
}

function buildPrefsWidget() {
  return new PrefsWidget();
}
