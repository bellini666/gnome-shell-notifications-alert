UUID=notifications-alert-on-user-menu@hackedbellini.gmail.com
INSTALL_PATH=~/.local/share/gnome-shell/extensions/$(UUID)
ZIP_PATH=$(UUID).zip
SRC_PATH=src
SCHEMAS_PATH=schemas
LOCALE_DOMAIN=gnome-shell-notifications-alert
LOCALE_PATH=locale
LOCALES=pt_BR de_DE cs_CZ nl_NL

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
	zip -r -u $(ZIP_PATH) $(LOCALE_PATH) && \
	zip -r -u $(ZIP_PATH) $(SCHEMAS_PATH) && \
	cd $(SRC_PATH) && \
	zip -r -u ../$(ZIP_PATH) .

install: zip-file
	mkdir -p $(INSTALL_PATH) && \
	unzip -o $(ZIP_PATH) -d $(INSTALL_PATH)

uninstall:
	rm $(INSTALL_PATH) -rf

clean:
	rm -f $(UUID).zip $(SCHEMAS_PATH)/gschemas.compiled
	for i in $(LOCALES); do \
		rm $(LOCALE_PATH)/$$i/ -rf; \
	done

.PHONY: locale zip-file
