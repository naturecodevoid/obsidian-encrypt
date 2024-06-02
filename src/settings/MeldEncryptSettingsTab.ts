import { App, PluginSettingTab, Setting } from "obsidian";
import { IMeldEncryptPluginFeature } from "src/features/IMeldEncryptPluginFeature";
import { SessionPasswordService } from "src/services/SessionPasswordService";
import MeldEncrypt from "../main";
import { IMeldEncryptPluginSettings } from "./MeldEncryptPluginSettings";

export default class MeldEncryptSettingsTab extends PluginSettingTab {
	plugin: MeldEncrypt;
	settings: IMeldEncryptPluginSettings;

	features:IMeldEncryptPluginFeature[];

	constructor(
		app: App,
		plugin: MeldEncrypt,
		settings:IMeldEncryptPluginSettings,
		features: IMeldEncryptPluginFeature[]
	) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = settings;
		this.features = features;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		
		new Setting(containerEl)
			.setName('Confirm password?')
			.setDesc('Confirm password when encrypting. (Recommended)')
			.addToggle( toggle =>{
				toggle
					.setValue(this.settings.confirmPassword)
					.onChange( async value =>{
						this.settings.confirmPassword = value;
						await this.plugin.saveSettings();
					})
			})
		;

		const updateRememberPasswordSettingsUi = () => {
			
			if ( !this.settings.rememberPassword ) {
				pwTimeoutSetting.settingEl.hide();
				rememberPasswordLevelSetting.settingEl.hide();
				return;
			}

			if ( this.settings.rememberPasswordLevel != SessionPasswordService.LevelEnvironment ){
				pwTimeoutSetting.settingEl.show();
			}else{
				pwTimeoutSetting.settingEl.hide();
			}

			rememberPasswordLevelSetting.settingEl.show();

			const rememberPasswordTimeout = this.settings.rememberPasswordTimeout;

			let timeoutString = `For ${rememberPasswordTimeout} minutes`;
			if( rememberPasswordTimeout == 0 ){
				timeoutString = 'Until Obsidian is closed';
			}

			pwTimeoutSetting.setName( `Remember Password (${timeoutString})` )
		
		}

		new Setting(containerEl)
			.setName('Remember password?')
			.setDesc('Remember the last used passwords when encrypting or decrypting.  Passwords are remembered until they timeout or Obsidian is closed')
			.addToggle( toggle =>{
				toggle
					.setValue(this.settings.rememberPassword)
					.onChange( async value => {
						this.settings.rememberPassword = value;
						await this.plugin.saveSettings();
						SessionPasswordService.setActive( this.settings.rememberPassword );
						updateRememberPasswordSettingsUi();
					})
			})
		;

		const rememberPasswordLevelSetting = new Setting(containerEl)
			.setName('Remember passwords by:')
			.setDesc( this.buildRememberPasswordDescription() )
			.addDropdown( cb =>{
				cb
					.addOption( SessionPasswordService.LevelEnvironment, 'Environment Variable')
					.addOption( SessionPasswordService.LevelVault, 'Vault')
					.addOption( SessionPasswordService.LevelParentPath, 'Folder')
					.addOption( SessionPasswordService.LevelFilename, 'File')
					.setValue( this.settings.rememberPasswordLevel )
					.onChange( async value => {
						this.settings.rememberPasswordLevel = value;
						await this.plugin.saveSettings();
						SessionPasswordService.setLevel( this.settings.rememberPasswordLevel );
						updateRememberPasswordSettingsUi();
					})
				;
			})
		;

		
		const pwTimeoutSetting = new Setting(containerEl)
			.setDesc('The number of minutes to remember passwords.')
			.addSlider( slider => {
				slider
					.setLimits(0, 120, 5)
					.setValue(this.settings.rememberPasswordTimeout)
					.onChange( async value => {
						this.settings.rememberPasswordTimeout = value;
						await this.plugin.saveSettings();
						SessionPasswordService.setAutoExpire( this.settings.rememberPasswordTimeout );
						updateRememberPasswordSettingsUi();
					})
				;
				
			})
		;

		let envVarValue = '';
		const envVarSetting = new Setting(containerEl)
			.setName('Set the environment variable to:')
			.setDesc( 'When needed the password is read from the environment variable named `MDENC_KEY`.' )
			.addText( text => {
				text
				.onChange( async value => {
					envVarValue = value;
				})
				;
			})
			.addButton( btn => {
				btn
					.setButtonText( 'Set')
					.onClick( async () => {
						process.env['MDENC_KEY'] = envVarValue;
					})
				;
			})
		;

		updateRememberPasswordSettingsUi();

		// build feature settings
		this.features.forEach(f => {
			f.buildSettingsUi( containerEl, async () => await this.plugin.saveSettings() );
		});
		
	}

	private buildRememberPasswordDescription( ) : DocumentFragment {
		const f = new DocumentFragment();

		const tbody = f.createEl( 'table' ).createTBody();

		let tr = tbody.createEl( 'tr' );
		tr.createEl( 'th', { text: 'Environment Variable:', attr: { 'align': 'right', 'style': 'width:12em;'} });
		tr.createEl( 'td', { text: 'The password is read from the environment variable `MDENC_KEY`.' });
		
		tr = tbody.createEl( 'tr' );
		tr.createEl( 'th', { text: 'Vault:', attr: { 'align': 'right'} });
		tr.createEl( 'td', { text: 'Typically, you\'ll use the same password every time.' });
		
		tr = tbody.createEl( 'tr' );
		tr.createEl( 'th', { text: 'Folder:', attr: { 'align': 'right'} });
		tr.createEl( 'td', { text: 'Typically, you\'ll use the same password for each note within a folder.' });

		tr = tbody.createEl( 'tr' );
		tr.createEl( 'th', { text: 'File:', attr: { 'align': 'right'} });
		tr.createEl( 'td', { text: 'Typically, each note will have a unique password.' });

		return f;
	}

}