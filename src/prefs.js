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
const Lang = imports.lang;

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

let settings;
let boolSettings;
let intSettings;
let colorSettings;

function _createBoolSetting(setting) {
  let hbox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});

  let settingLabel = new Gtk.Label({label: boolSettings[setting].label,
                                    xalign: 0});

  let settingSwitch = new Gtk.Switch({active: settings.get_boolean(setting)});
  settingSwitch.connect('notify::active', function(button) {
    settings.set_boolean(setting, button.active);
  });

  if (boolSettings[setting].help) {
    settingLabel.set_tooltip_text(boolSettings[setting].help);
    settingSwitch.set_tooltip_text(boolSettings[setting].help);
  }

  hbox.pack_start(settingLabel, true, true, 0);
  hbox.add(settingSwitch);

  return hbox;
}

function _createIntSetting(setting) {
  let hbox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});

  let settingLabel = new Gtk.Label({label: intSettings[setting].label,
                                    xalign: 0});

  let spinButton = Gtk.SpinButton.new_with_range(
    intSettings[setting].min,
    intSettings[setting].max,
    intSettings[setting].step)
  spinButton.set_value(settings.get_int(setting));
  spinButton.connect('notify::value', function(spin) {
    settings.set_int(setting, spin.get_value_as_int());
  });

  if (intSettings[setting].help) {
    settingLabel.set_tooltip_text(intSettings[setting].help);
    spinButton.set_tooltip_text(intSettings[setting].help);
  }

  hbox.pack_start(settingLabel, true, true, 0);
  hbox.add(spinButton);

  return hbox;
}

function _createColorSetting(setting) {
  let hbox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});

  let settingLabel = new Gtk.Label({label: colorSettings[setting].label,
                                    xalign: 0});

  let color = Lib.getColorByHexadecimal(settings.get_string(setting));
  let colorButton = new Gtk.ColorButton();
  colorButton.set_color(color);
  colorButton.connect('notify::color', function(button) {
    let hex = Lib.getHexadecimalByColor(button.get_color());
    settings.set_string(setting, hex);
  });

  if (colorSettings[setting].help) {
    settingLabel.set_tooltip_text(colorSettings[setting].help);
    colorButton.set_tooltip_text(colorSettings[setting].help);
  }

  hbox.pack_start(settingLabel, true, true, 0);
  hbox.add(colorButton);

  return hbox;
}

function _createFilterListSetting() {
  let settingLabel = new Gtk.Label({label: _("Filter List"), xalign: 0});
  let widget = new Widget();
  let blbox = new Gtk.Grid({column_spacing: 5, row_spacing: 5, margin: 0});
  blbox.attach(settingLabel,0,0,1,1);
  blbox.attach(widget,0,1,1,1);
  return blbox;
}

function _createFilterTypeSetting() {
  let hbox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
  let settingLabel = new Gtk.Label({label: _("Filter Type"), xalign: 0});

  let listStore = new Gtk.ListStore();
  listStore.set_column_types ([
    GObject.TYPE_STRING,
    GObject.TYPE_STRING]);

  listStore.insert_with_valuesv (-1,  [0, 1], [0, _("Blacklist")]);
  listStore.insert_with_valuesv (-1,  [0, 1], [1, _("Whitelist")]);

  let filterComboBox = new Gtk.ComboBox({ model: listStore });
  filterComboBox.set_active (settings.get_int(SETTING_FILTER_TYPE));
  filterComboBox.set_id_column(0);

  let rendererText = new Gtk.CellRendererText();
  filterComboBox.pack_start (rendererText, false);
  filterComboBox.add_attribute (rendererText, "text", 1);

  filterComboBox.connect('changed', function(entry) {
    let id = filterComboBox.get_active_id();
    if (id == null)
        return;
    settings.set_int(SETTING_FILTER_TYPE, id);
  });

  hbox.pack_start(settingLabel, true, true, 0);
  hbox.add(filterComboBox);
  return hbox;
}

/*
   Shell-extensions handlers
*/

function init() {
  Lib.initTranslations(Me);
  settings = Lib.getSettings(Me);

  colorSettings = {
    color: {
      label: _("Alert color"),
      help: _("The color used to paint the message on user's menu")
    },
  };

  intSettings = {
    blinkrate: {
      label: _("Blink rate (in ms)"),
      help: _("The rate that the alert blinks, in ms. 0 means no blink (default: 800)"),
      min: 0,
      max: 10000,
      step: 1
    },
  };

  boolSettings = {
    chatonly: {
      label: _("Only alert for chat notifications"),
      help: _("Only chat notifications (like Empathy ones) will get alerted (default: OFF)")
    },
    force: {
      label: _("Force alerting even when notifications are set to OFF"),
      help: _("Alert even if you set notifications to OFF on user menu (default: OFF)")
    },
  };
}


/*
   Blacklist widget
*/
const Widget = new GObject.Class({
  Name: 'NotificationsAlert.Prefs.BlackListWidget',
  GTypeName: 'NotificationsAlertBlackListPrefsWidget',
  Extends: Gtk.Grid,

  _init: function(params) {
    this.parent(params);
    this.set_orientation(Gtk.Orientation.VERTICAL);

    Lib.initTranslations(Me);
    this._settings = Lib.getSettings(Me);

    this._store = new Gtk.ListStore();
    this._store.set_column_types([Gio.AppInfo, GObject.TYPE_STRING, Gio.Icon]);

    let scrolled = new Gtk.ScrolledWindow({ shadow_type: Gtk.ShadowType.IN});
    scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
    scrolled.set_min_content_height(150);
    this.add(scrolled);

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

    scrolled.add(this._treeView);

    let toolbar = new Gtk.Toolbar({ icon_size: Gtk.IconSize.SMALL_TOOLBAR });
    toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);
    this.add(toolbar);

    let newButton = new Gtk.ToolButton({ icon_name: 'bookmark-new-symbolic',
                                         label: _("Add Rule"),
                                         is_important: true });
    newButton.connect('clicked', Lang.bind(this, this._createNew));
    toolbar.add(newButton);

    let delButton = new Gtk.ToolButton({ icon_name: 'edit-delete-symbolic'  });
      delButton.connect('clicked', Lang.bind(this, this._deleteSelected));
      toolbar.add(delButton);

    this._changedPermitted = true;
    this._refresh();
  },

  _createNew: function() {
    let dialog = new Gtk.Dialog({ title: _("Blacklist app"),
                                  transient_for: this.get_toplevel(),
                                  use_header_bar: true,
                                  modal: true });
    dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
    let addButton = dialog.add_button(_("Add"), Gtk.ResponseType.OK);
    dialog.set_default_response(Gtk.ResponseType.OK);

    dialog._appChooser = new Gtk.AppChooserWidget({ show_all: true });

    let lbl = new Gtk.Label({label: _("Choose an application to blacklist:"),
                             xalign: 0.5});
    let hbox = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL,
                            margin: 5});
    hbox.pack_start(lbl, false, true, 0);
    hbox.pack_start(dialog._appChooser, true, true, 0);
    dialog.get_content_area().pack_start(hbox, true, true, 0);

    dialog.connect('response', Lang.bind(this, function(dialog, id) {
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
      }));

    dialog.show_all();
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

function buildPrefsWidget() {
  let frame = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL,
                           border_width: 10});
  let vbox = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL,
                          margin: 20, margin_top: 10, spacing: 5});
  let setting;

  // Add all color settings
  for (setting in colorSettings) {
    let hbox = _createColorSetting(setting);
    vbox.add(hbox);
  }
  // Add all bool settings
  for (setting in boolSettings) {
    let hbox = _createBoolSetting(setting);
    vbox.add(hbox);
  }
  // Add all int settings
  for (setting in intSettings) {
    let hbox = _createIntSetting(setting);
    vbox.add(hbox);
  }

  // Add filter type setting
  let filterType = _createFilterTypeSetting();
  vbox.add(filterType);

  // Add filter list
  let blbox = _createFilterListSetting();
  vbox.add(blbox);

  frame.add(vbox);
  frame.show_all();

  return frame;
}
