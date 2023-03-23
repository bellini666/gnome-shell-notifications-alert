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
 * Most of this code was forked from gnome-shell-extensions convenience.js:
 *   http://git.gnome.org/browse/gnome-shell-extensions/tree/lib/convenience.js
 *
 */

const Gettext = imports.gettext;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;

const Config = imports.misc.config;

/*
   Color utils
 */

function getRGBAColor(rgba) {
  let color = new Gdk.RGBA();

  if (!color.parse(rgba)) {
    // On any error, default to red
    color = new Gdk.RGBA({red: 1.0, alpha: 1.0});
  }

  return color;
}

function getAppNamesFromAppInfos(list) {
  let appNames = [ ];
  for (let i = 0; i < list.length; i++) {
    let id = list[i];
    let appInfo = Gio.DesktopAppInfo.new(id);
    if (!appInfo)
      continue;
    appNames.push(appInfo.get_name());
  }
  return appNames;
}
