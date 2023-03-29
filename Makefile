UUID=notifications-alert-on-user-menu@hackedbellini.gmail.com
ZIP_PATH=$(UUID).shell-extension.zip
SRC_PATH=src
LOCALE_DOMAIN=gnome-shell-notifications-alert
LOCALE_DIR=locale
LOCALE_PATH=$(SRC_PATH)/$(LOCALE_DIR)
LOCALES_TEMPLATE=${LOCALE_PATH}/messages.pot

locale-files:
	xgettext --from-code=UTF-8 --keyword=_ --sort-output --language=JavaScript src/*.js -o "${LOCALES_TEMPLATE}" && \
	xgettext --join-existing --from-code=UTF-8 --keyword=translatable --sort-output --language=Glade src/*.ui -o "${LOCALES_TEMPLATE}" && \
	for i in $(LOCALE_PATH)/*.po; do \
		msgmerge -U "$$i" "${LOCALES_TEMPLATE}"; \
	done

zip-file:
	gnome-extensions pack -f --podir=$(LOCALE_DIR) --extra-source=prefs.ui --extra-source=lib.js $(SRC_PATH)

install: zip-file
	gnome-extensions install -f $(ZIP_PATH)

uninstall:
	gnome-extension uninstall $(UUID)

clean:
	rm -f $(ZIP_PATH)

.PHONY: zip-file
