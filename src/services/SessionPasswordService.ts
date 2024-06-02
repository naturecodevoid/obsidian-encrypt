import { TFile } from "obsidian";
import { MemoryCache } from "./MemoryCache";
import { Utils } from "./Utils";

export interface IPasswordAndHint{
	password: string;
	hint: string;
}

export class SessionPasswordService{

	private static isActive = true;

	public static blankPasswordAndHint : IPasswordAndHint = { password:'', hint:'' };

	private static cache = new MemoryCache<IPasswordAndHint>();
	
	private static baseMinutesToExpire = 0;
	private static expiryTime : number | null = null;

	public static LevelFilename = 'filename';
	public static LevelParentPath = 'parentPath';
	public static LevelVault = 'vault';
	public static LevelEnvironment = 'env';
	private static allLevels = [
		SessionPasswordService.LevelFilename,
		SessionPasswordService.LevelParentPath,
		SessionPasswordService.LevelVault,
		SessionPasswordService.LevelEnvironment
	];
	private static level = SessionPasswordService.LevelEnvironment;

	public static setActive( isActive: boolean ) {
		SessionPasswordService.isActive = isActive;
		if (!SessionPasswordService.isActive){
			this.clear();
		}
	}

	/**
	 * 
	 * @param minutesToExpire set to 0 to never expire
	 */
	public static setAutoExpire( minutesToExpire:number | null ) : void{
		SessionPasswordService.baseMinutesToExpire = minutesToExpire ?? 0;
		SessionPasswordService.updateExpiryTime();
	}

	public static setLevel( level: string ) {
		if ( SessionPasswordService.level == level ){
			return;
		}
		if ( SessionPasswordService.allLevels.contains(level) ){
			SessionPasswordService.level = level;
		}
		SessionPasswordService.level = SessionPasswordService.LevelFilename;
		this.clear();
	}

	public static updateExpiryTime() : void {
		if (
			SessionPasswordService.baseMinutesToExpire == 0
			|| SessionPasswordService.baseMinutesToExpire == null
		){
			SessionPasswordService.expiryTime = null;
		} else {
			SessionPasswordService.expiryTime = Date.now() + SessionPasswordService.baseMinutesToExpire * 1000 * 60;
		}
	}

	public static putByFile( pw: IPasswordAndHint, file:TFile ): void {
		if (!SessionPasswordService.isActive){
			return;
		}

		const key = SessionPasswordService.getFileCacheKey( file );
		this.putByKey( key, pw );

		SessionPasswordService.updateExpiryTime();
	}

	public static getByFile( file:TFile  ) : IPasswordAndHint {
		if (!SessionPasswordService.isActive){
			return SessionPasswordService.blankPasswordAndHint;
		}
		this.clearIfExpired();
		SessionPasswordService.updateExpiryTime();

		const key = SessionPasswordService.getFileCacheKey( file );
		return this.getByKey( key, SessionPasswordService.blankPasswordAndHint );
	}

	public static putByPath( pw: IPasswordAndHint, path:string ): void {
		if (!SessionPasswordService.isActive){
			return;
		}

		const key = SessionPasswordService.getPathCacheKey( path );

		this.putByKey( key, pw );

		SessionPasswordService.updateExpiryTime();
	}

	public static getByPath( path: string ) : IPasswordAndHint {
		if (!SessionPasswordService.isActive){
			return SessionPasswordService.blankPasswordAndHint;
		}
		this.clearIfExpired();
		SessionPasswordService.updateExpiryTime();

		const key = SessionPasswordService.getPathCacheKey( path );
		return this.getByKey( key, SessionPasswordService.blankPasswordAndHint );
	}

	private static getPathCacheKey( path : string ) : string {
		
		if (
			SessionPasswordService.level ==  SessionPasswordService.LevelEnvironment
			|| SessionPasswordService.level == SessionPasswordService.LevelVault
		){
			return '$' + SessionPasswordService.level;
		}

		if (SessionPasswordService.level == SessionPasswordService.LevelParentPath){
			const parentPath = path.split('/').slice(0,-1).join('/');
			return parentPath;
		}

		return path;
	}

	private static getFileCacheKey( file : TFile ) : string {
		
		if (
			SessionPasswordService.level ==  SessionPasswordService.LevelEnvironment
			|| SessionPasswordService.level == SessionPasswordService.LevelVault
		){
			return '$' + SessionPasswordService.level;
		}

		if (SessionPasswordService.level == SessionPasswordService.LevelParentPath){
			return file.parent!.path;
		}

		const fileExExt = Utils.getFilePathExcludingExtension( file );
		return fileExExt;

	}

	private static clearIfExpired() : void{
		if ( SessionPasswordService.expiryTime == null ){
			return;
		}
		if ( Date.now() < SessionPasswordService.expiryTime ){
			return;
		}
		this.clear();
	}

	public static clearForFile( file: TFile ) : void {
		const key = SessionPasswordService.getFileCacheKey( file );
		this.cache.removeKey( key );
	}

	public static clear(): number {
		const count = this.cache.getKeys().length;
		this.cache.clear();
		return count;
	}

	private static putByKey( key: string, pw: IPasswordAndHint ) : void {
		if (SessionPasswordService.level == SessionPasswordService.LevelEnvironment){
			return;
		}
		this.cache.put( key, pw );
	}

	public static getByKey( key: string, defaultValue: IPasswordAndHint ): IPasswordAndHint {
		console.debug( 'SessionPasswordService.getByKey', { key, defaultValue } );
		if (SessionPasswordService.level == SessionPasswordService.LevelEnvironment){
			// get from env
			console.debug(process.env);
			var pw = process.env['MDENC_KEY'];
			if (pw){
				return { password: pw, hint: '' };
			}

			return defaultValue;
		}
		return this.cache.get( key, defaultValue );
	}
}

