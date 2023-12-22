NPM_MOD_DIR := $(CURDIR)/node_modules
NPM_BIN_DIR := $(NPM_MOD_DIR)/.bin

EXTERNAL_LIB_DIR := $(CURDIR)/extlib
TOOLS_DIR := $(CURDIR)/tools

.PHONY: xpi install_dependency lint format init_extlib update_extlib install_extlib

all: xpi

install_dependency:
	[ -e "$(NPM_BIN_DIR)/eslint" -a -e "$(NPM_BIN_DIR)/jsonlint-cli" ] || npm install --save-dev

lint: install_dependency
	"$(NPM_BIN_DIR)/eslint" . --ext=.js --report-unused-disable-directives
	find . -type d -name node_modules -prune -o -type f -name '*.json' -print | xargs "$(NPM_BIN_DIR)/jsonlint-cli"

format: install_dependency
	"$(NPM_BIN_DIR)/eslint" . --ext=.js --report-unused-disable-directives --fix

xpi: init_extlib install_extlib lint
	rm -f ./*.xpi
	zip -r -9 send-tabs-to-device-simulator.xpi manifest.json _locales common options background resources extlib -x '*/.*' >/dev/null 2>/dev/null

init_extlib:
	git submodule update --init

update_extlib:
	git submodule foreach 'git checkout trunk || git checkout main || git checkout master && git pull'

install_extlib: install_dependency
	rm -f $(EXTERNAL_LIB_DIR)/*.js
	cp submodules/webextensions-lib-event-listener-manager/EventListenerManager.js $(EXTERNAL_LIB_DIR)/
	cp submodules/webextensions-lib-configs/Configs.js $(EXTERNAL_LIB_DIR)/; echo 'export default Configs;' >> $(EXTERNAL_LIB_DIR)/Configs.js
	cp submodules/webextensions-lib-options/Options.js $(EXTERNAL_LIB_DIR)/; echo 'export default Options;' >> $(EXTERNAL_LIB_DIR)/Options.js
	cp submodules/webextensions-lib-l10n/l10n.js $(EXTERNAL_LIB_DIR)/; echo 'export default l10n;' >> $(EXTERNAL_LIB_DIR)/l10n.js
	cp submodules/webextensions-lib-l10n/l10n.js $(EXTERNAL_LIB_DIR)/l10n-classic.js; echo 'window.l10n = l10n;' >> $(EXTERNAL_LIB_DIR)/l10n-classic.js
