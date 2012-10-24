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

const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Gettext = imports.gettext.domain('gnome-shell-notifications-alert');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;

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

  let spinButton = new Gtk.SpinButton.new_with_range(
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
      label: _("Blink rate"),
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

function buildPrefsWidget() {
  let frame = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL,
                           border_width: 10});
  let vbox = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL,
                          margin: 20, margin_top: 10});

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

  frame.add(vbox);
  frame.show_all();

  return frame;
}
