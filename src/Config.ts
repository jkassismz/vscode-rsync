import {
    window,
    WorkspaceConfiguration,
    workspace
} from 'vscode';
import * as path from 'path';
import * as child from 'child_process';

export class Site { 
    
    constructor(
        public localPath: string,
        public remotePath: string,
        public deleteFiles: boolean,
        public flags: string,
        public exclude: Array<string>,
        public include: Array<string>,
        public chmod: string,
        public shell: string,
        public executableShell: string,
        public executable: string,
        public afterSync: string[],
        public options: Array<Array<String>>,
        public args: Array<string>
    ) {}

}

export class Config {
    notification: boolean;
    autoShowOutput: boolean;
    autoShowOutputOnError: boolean;
    autoHideOutput: boolean;
    onFileSave: boolean;
    onFileSaveIndividual: boolean;
    onFileLoadIndividual: boolean;
    showProgress: boolean;
    sites: Array<Site>;
    cygpath: string;
    watchGlobs: Array<string>;
    useWSL: boolean;

    constructor(config: WorkspaceConfiguration) {
        this.onFileSave = config.get('onSave', false);
        this.onFileSaveIndividual = config.get('onSaveIndividual', false);
        this.onFileLoadIndividual = config.get('onLoadIndividual', false);
        this.showProgress = config.get('showProgress', true);
        this.notification = config.get('notification', false);
        this.autoShowOutput = config.get('autoShowOutput', false);
        this.autoShowOutputOnError = config.get('autoShowOutputOnError', true);
        this.autoHideOutput = config.get('autoHideOutput', false);
        this.cygpath = config.get('cygpath', undefined);
        this.watchGlobs = config.get('watchGlobs', []);
        this.useWSL = config.get('useWSL', false);
        
        let site_default = new Site(
            this.translatePath(config.get('local', null)),
            this.translatePath(config.get('remote', null)),
            config.get('delete', false),
            config.get('flags', 'rlptzv'),
            config.get('exclude', ['.git', '.vscode']),
            config.get('include', []),
            config.get('chmod', undefined),
            config.get('shell', undefined),
            config.get('executableShell', undefined),
            config.get('executable', 'rsync'),
            undefined,
            config.get('options', []),
            config.get('args', []),
        )

        let sites: Array<Site> = [];
        let config_sites: Array<Site> = config.get('sites', []);

        if(config_sites.length == 0) {
            sites.push(site_default);
        } else {
            for(let site of config_sites) {
                let clone = Object.assign({},site_default);
                clone = Object.assign(clone,site);
                sites.push(clone);
            }
        }

        let workspaceLocal = workspace.rootPath

        if (workspaceLocal !== undefined) {
            workspaceLocal += path.sep;
        } else {
            workspaceLocal === null;
        }

        workspaceLocal = this.translatePath(workspaceLocal);
        
        for(let site of sites) {
            if(site.localPath === null) {
                site.localPath = workspaceLocal;
            }
            if(workspaceLocal != null) {
                site.localPath = site.localPath.replace("${workspaceRoot}",workspaceLocal);
                if(site.remotePath != null) {
                    site.remotePath = site.remotePath.replace("${workspaceRoot}",workspaceLocal);   
                    site.remotePath = site.remotePath.replace("${workspaceFolder}",workspaceLocal);
                    site.remotePath = site.remotePath.replace("${workspaceFolderBasename}",path.basename(workspace.rootPath));
                }
            }
        }
        
        this.sites = sites;
    }

    translatePath(path: string): string {
        if(this.cygpath) {
            let rtn = child.spawnSync(this.cygpath, [path]);
            if(rtn.status != 0) {
                throw new Error("Path Tranlate Issue");
            }
            if(rtn.error) {
                throw rtn.error;
            }
            let s_rtn = rtn.stdout.toString();
            s_rtn = s_rtn.trim();
            return s_rtn;
        }
        return path;
    }
}
