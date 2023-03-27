UUID=notifications-alert-on-user-menu@hackedbellini.gmail.com
INSTALL_PATH=~/.local/share/gnome-shell/extensions/$(UUID)
UPDATE_PATH=~/.local/share/gnome-shell/extension-updates/$(UUID)
ZIP_PATH=$(UUID).zip
SRC_PATH=src
SCHEMAS_PATH=schemas
LOCALE_DOMAIN=gnome-shell-notifications-alert
LOCALE_PATH=locale
LOCALES_TEMPLATE=${LOCALE_PATH}/messages.pot
LOCALES=pt_BR de_DE cs_CZ nl_NL

locale-files:
	xgettext --from-code=UTF-8 --keyword=_ --sort-output --language=JavaScript src/*.js -o "${LOCALES_TEMPLATE}" && \
	xgettext --join-existing --from-code=UTF-8 --keyword=translatable --sort-output --language=Glade src/*.ui -o "${LOCALES_TEMPLATE}" && \
	for i in $(LOCALES); do \
		msgmerge -U "$(LOCALE_PATH)/$$i.po" "${LOCALES_TEMPLATE}"; \
	done

locale:
	for i in $(LOCALES); do \
		mkdir -p $(LOCALE_PATH)/$$i/LC_MESSAGES/ && \
		msgfmt $(LOCALE_PATH)/$$i.po -o \
		$(LOCALE_PATH)/$$i/LC_MESSAGES/$(LOCALE_DOMAIN).mo; \
	done

zip-file: locale
	glib-compile-schemas $(SCHEMAS_PATH) \
		--targetdir=$(SCHEMAS_PATH) \
		--strict && \
	zip -r -u $(ZIP_PATH) $(LOCALE_PATH) -x '*.po' '*.pot' && \
	zip -r -u $(ZIP_PATH) $(SCHEMAS_PATH) && \
	cd $(SRC_PATH) && \
	zip -r -u ../$(ZIP_PATH) .

install: zip-file
	mkdir -p $(INSTALL_PATH) && \
	unzip -o $(ZIP_PATH) -d $(INSTALL_PATH)

update: zip-file
	mkdir -p $(UPDATE_PATH) && \
	unzip -o $(ZIP_PATH) -d $(UPDATE_PATH)

uninstall:
	rm $(INSTALL_PATH) -rf

clean:
	rm -f $(UUID).zip $(SCHEMAS_PATH)/gschemas.compiled
	for i in $(LOCALES); do \
		rm $(LOCALE_PATH)/$$i/ -rf; \
	done

.PHONY: locale zip-file
