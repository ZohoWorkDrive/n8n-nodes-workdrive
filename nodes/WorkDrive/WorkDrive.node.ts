import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

function getBaseUrl(region: string): string {
	const map: Record<string, string> = {
		com: 'https://www.zohoapis.com/workdrive/api/v1',
		eu:  'https://www.zohoapis.eu/workdrive/api/v1',
		in:  'https://www.zohoapis.in/workdrive/api/v1',
		au:  'https://www.zohoapis.com.au/workdrive/api/v1',
		ca:  'https://www.zohoapis.ca/workdrive/api/v1',
		jp:  'https://www.zohoapis.jp/workdrive/api/v1',
	};
	return map[region] ?? map['com'];
}

function getDownloadBaseUrl(region: string): string {
	const map: Record<string, string> = {
		com: 'https://download.zoho.com/v1/workdrive',
		eu:  'https://download.zoho.eu/v1/workdrive',
		in:  'https://download.zoho.in/v1/workdrive',
		au:  'https://download.zoho.com.au/v1/workdrive',
		ca:  'https://download.zoho.ca/v1/workdrive',
		jp:  'https://download.zoho.jp/v1/workdrive',
	};
	return map[region] ?? map['com'];
}

function getUploadUrl(region: string): string {
	const map: Record<string, string> = {
		com: 'https://www.zohoapis.com/workdrive/api/v1/upload',
		eu:  'https://www.zohoapis.eu/workdrive/api/v1/upload',
		in:  'https://www.zohoapis.in/workdrive/api/v1/upload',
		au:  'https://www.zohoapis.com.au/workdrive/api/v1/upload',
		ca:  'https://www.zohoapis.ca/workdrive/api/v1/upload',
		jp:  'https://www.zohoapis.jp/workdrive/api/v1/upload',
	};
	return map[region] ?? map['com'];
}

export class WorkDrive implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zoho WorkDrive',
		name: 'workDrive',
		icon: 'file:workdrive.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with Zoho WorkDrive — files, folders, and sharing',
		defaults: { name: 'WorkDrive' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'workDriveOAuth2Api', required: true }],
		properties: [

			// ── Region ───────────────────────────────────────────────
			{
				displayName: 'Region',
				name: 'region',
				type: 'options',
				options: [
					{ name: 'Australia (.com.au)', value: 'au' },
					{ name: 'Canada (.ca)', value: 'ca' },
					{ name: 'Europe (.eu)', value: 'eu' },
					{ name: 'India (.in)', value: 'in' },
					{ name: 'Japan (.jp)', value: 'jp' },
					{ name: 'US / Global (.com)', value: 'com' },
				],
				default: 'com',
				description: 'Must match the region selected in your WorkDrive credential',
			},

			// ── Resource ─────────────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'File',   value: 'file' },
					{ name: 'Folder', value: 'folder' },
					{ name: 'Share',  value: 'share' },
				],
				default: 'file',
			},

			// ── File Operations ───────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['file'] } },
				options: [
					{ name: 'Copy', value: 'copyResource', description: 'Copy a file to another folder', action: 'Copy a file' },
					{ name: 'Delete', value: 'deleteResource', description: 'Move a file to Trash', action: 'Delete a file' },
					{ name: 'Download', value: 'downloadFile', description: 'Download a file as binary data', action: 'Download a file' },
					{ name: 'Get', value: 'getInfo', description: 'Get metadata for a file', action: 'Get file info' },
					{ name: 'Move', value: 'moveResource', description: 'Move a file to another folder', action: 'Move a file' },
					{ name: 'Rename', value: 'renameResource', description: 'Rename a file', action: 'Rename a file' },
					{ name: 'Upload', value: 'uploadFile', description: 'Upload a file to a folder', action: 'Upload a file' },
				],
				default: 'uploadFile',
			},

			// ── Folder Operations ─────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['folder'] } },
				options: [
					{ name: 'Copy', value: 'copyResource', description: 'Copy a folder to another folder', action: 'Copy a folder' },
					{ name: 'Create', value: 'createFolder', description: 'Create a new folder', action: 'Create a folder' },
					{ name: 'Delete', value: 'deleteResource', description: 'Move a folder to Trash', action: 'Delete a folder' },
					{ name: 'Get', value: 'getInfo', description: 'Get metadata for a folder', action: 'Get folder info' },
					{ name: 'List Contents', value: 'listFolder', description: 'List contents of a folder', action: 'List folder contents' },
					{ name: 'Move', value: 'moveResource', description: 'Move a folder to another folder', action: 'Move a folder' },
					{ name: 'Rename', value: 'renameResource', description: 'Rename a folder', action: 'Rename a folder' },
				],
				default: 'listFolder',
			},

			// ── Share Operations ──────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['share'] } },
				options: [
					{ name: 'Create External Link', value: 'createShare', description: 'Create a public external share link', action: 'Create external share link' },
					{ name: 'Delete External Link', value: 'deleteShare', description: 'Revoke an external share link',       action: 'Delete external share link' },
					{ name: 'Get External Link',    value: 'getShare',    description: 'Get info about a share link',         action: 'Get external share link' },
				],
				default: 'createShare',
			},

			// ── Upload fields ─────────────────────────────────────────
			{
				displayName: 'Parent Folder ID',
				name: 'folderId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. abc123xyz',
				description: 'The ID of the WorkDrive folder to upload the file into',
				displayOptions: { show: { resource: ['file'], operation: ['uploadFile'] } },
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'e.g. report.pdf',
				description: 'Name to save as in WorkDrive. Leave blank to use the filename from binary data, file path, or URL.',
				displayOptions: { show: { resource: ['file'], operation: ['uploadFile'] } },
			},
			{
				displayName: 'Binary File',
				name: 'binaryData',
				type: 'boolean',
				default: false,
				displayOptions: { show: { resource: ['file'], operation: ['uploadFile'] } },
				description: 'Whether to use binary data from a previous node as the file to upload. When off, provide a File URL to fetch and upload a remote file.',
				hint: 'To upload a file from disk, add a "Read/Write Files from Disk" node before this one, then set this to ON.',
			},
			// ── Binary ON: which field holds the binary ───────────────
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				hint: 'The binary field name from the previous node (usually "data"). Connect an HTTP Request node with Response Format set to File, or a Read/Write Files from Disk node.',
				displayOptions: { show: { resource: ['file'], operation: ['uploadFile'], binaryData: [true] } },
				description: 'Name of the binary property in the input data containing the file to upload',
			},
			// ── Binary OFF: URL only ──────────────────────────────────
			{
				displayName: 'File URL',
				name: 'fileUrl',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://example.com/report.pdf',
				displayOptions: { show: { resource: ['file'], operation: ['uploadFile'], binaryData: [false] } },
				description: 'URL of a remote file to fetch and upload to WorkDrive',
			},
			{
				displayName: 'If File Name Exists',
				name: 'overrideNameExist',
				type: 'options',
				default: 'true',
				displayOptions: { show: { resource: ['file'], operation: ['uploadFile'] } },
				options: [
					{ name: 'Keep Both (Add Timestamp)', value: 'false', description: 'Upload as a new file with a timestamp' },
					{ name: 'Replace Existing File', value: 'true', description: 'Overwrite the existing file' },
				],
			},

			// ── Download fields ───────────────────────────────────────
			{
				displayName: 'File ID',
				name: 'resourceId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. abc123xyz',
				displayOptions: { show: { resource: ['file'], operation: ['downloadFile'] } },
			},
			{
				displayName: 'Put Output File in Field',
				name: 'outputBinaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				description: 'Name of the binary property to store the downloaded file in',
				displayOptions: { show: { resource: ['file'], operation: ['downloadFile'] } },
			},

			// ── File: Get Info / Copy / Move / Rename / Delete ────────
			{
				displayName: 'File ID',
				name: 'resourceId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. abc123xyz',
				displayOptions: { show: { resource: ['file'], operation: ['getInfo', 'copyResource', 'moveResource', 'renameResource', 'deleteResource'] } },
			},
			{
				displayName: 'Destination Folder ID',
				name: 'destinationFolderId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. abc123xyz',
				displayOptions: { show: { resource: ['file'], operation: ['copyResource', 'moveResource'] } },
			},
			{
				displayName: 'New Name',
				name: 'newName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['file'], operation: ['renameResource'] } },
			},

			// ── Folder fields ─────────────────────────────────────────
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. abc123xyz',
				displayOptions: { show: { resource: ['folder'], operation: ['listFolder', 'createFolder'] } },
			},
			{
				displayName: 'Folder ID',
				name: 'resourceId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. abc123xyz',
				displayOptions: { show: { resource: ['folder'], operation: ['getInfo', 'copyResource', 'moveResource', 'renameResource', 'deleteResource'] } },
			},
			{
				displayName: 'Destination Folder ID',
				name: 'destinationFolderId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['folder'], operation: ['copyResource', 'moveResource'] } },
			},
			{
				displayName: 'Folder Name',
				name: 'folderName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['folder'], operation: ['createFolder'] } },
			},
			{
				displayName: 'New Name',
				name: 'newName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['folder'], operation: ['renameResource'] } },
			},

			// ── List Folder fields ────────────────────────────────────
			{
				displayName: 'Folder Location',
				name: 'folderLocation',
				type: 'options',
				default: 'teamfolder',
				displayOptions: { show: { resource: ['folder'], operation: ['listFolder'] } },
				options: [
					{ name: 'My Folders', value: 'myfolders', description: 'Folder inside your personal My Folders space' },
					{ name: 'Team Folder', value: 'teamfolder', description: 'Folder inside a shared Team Folder' },
				],
			},
			{
				displayName: 'List Type',
				name: 'listType',
				type: 'options',
				default: 'files',
				displayOptions: { show: { resource: ['folder'], operation: ['listFolder'] } },
				options: [
					{ name: 'Files',         value: 'files',        description: 'List all files' },
					{ name: 'Folders',       value: 'folders',      description: 'List all subfolders' },
					{ name: 'Trashed Files', value: 'trashedfiles', description: 'List trashed files' },
				],
			},
			{
				displayName: 'Options',
				name: 'listOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['folder'], operation: ['listFolder'] } },
				options: [
					{
						displayName: 'Return All',
						name: 'returnAll',
						type: 'boolean',
						default: false,
						description: 'Whether to return all results or only up to a given limit',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 200 },
						default: 50,
						description: 'Max number of results to return',
					},
					{ displayName: 'Offset', name: 'offset', type: 'number', typeOptions: { minValue: 0 }, default: 0 },
				],
			},

			// ── Share fields ──────────────────────────────────────────
			{
				displayName: 'Resource ID',
				name: 'resourceId',
				type: 'string',
				required: true,
				default: '',
				description: 'The ID of the file or folder to share',
				displayOptions: { show: { resource: ['share'], operation: ['createShare'] } },
			},
			{
				displayName: 'Share Link ID',
				name: 'shareLinkId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['share'], operation: ['getShare', 'deleteShare'] } },
			},
			// ── Create Share: mandatory fields ───────────────────────
			{
				displayName: 'Link Name',
				name: 'linkName',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. Public Report Link',
				description: 'Name of the share link (mandatory)',
				displayOptions: { show: { resource: ['share'], operation: ['createShare'] } },
			},
			{
				displayName: 'Role',
				name: 'roleId',
				type: 'options',
				required: true,
				default: '34',
				description: 'Permission level given to the person accessing the link. Note: folders support Editor/Upload/Viewer only; native files (Docs/Sheets/Slides) support Editor/View & Comment/Viewer only; other files support Viewer only.',
				displayOptions: { show: { resource: ['share'], operation: ['createShare'] } },
				options: [
					{ name: 'Editor', value: '5', description: 'Can edit — folders and native files only' },
					{ name: 'Upload', value: '7', description: 'Can upload files — folders only' },
					{ name: 'View & Comment', value: '6', description: 'Can view and comment — native files only' },
					{ name: 'Viewer', value: '34', description: 'Can view only — works for all file types' },
				],
			},
			{
				displayName: 'Allow Download',
				name: 'allowDownload',
				type: 'boolean',
				default: true,
				description: 'Whether to allow the shared user to download the file',
				displayOptions: { show: { resource: ['share'], operation: ['createShare'] } },
			},
			{
				displayName: 'Request User Data',
				name: 'requestUserData',
				type: 'boolean',
				default: false,
				description: 'Whether to require the visitor to enter their name, phone, and email before accessing',
				displayOptions: { show: { resource: ['share'], operation: ['createShare'] } },
			},
			// ── Create Share: optional fields ─────────────────────────
			{
				displayName: 'Additional Options',
				name: 'shareOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['share'], operation: ['createShare'] } },
				options: [
					{
						displayName: 'Email',
						name: 'Email',
						type: 'boolean',
						default: true,
						description: 'Whether to collect the visitor email when Request User Data is enabled',
					},
					{
						displayName: 'Expiration Date',
						name: 'expiration_date',
						type: 'string',
						default: '',
						placeholder: 'yyyy-mm-dd hh:mm:ss',
						description: 'Date and time after which the link is deactivated (24h format, e.g. 2026-12-31 23:59:00)',
					},
					{
						displayName: 'Name',
						name: 'Name',
						type: 'boolean',
						default: true,
						description: 'Whether to collect the visitor name when Request User Data is enabled',
					},
					{
						displayName: 'Password',
						name: 'password_text',
						type: 'string',
						typeOptions: { password: true },
						default: '',
						description: 'Password to protect the share link',
					},
					{
						displayName: 'Phone',
						name: 'Phone',
						type: 'boolean',
						default: true,
						description: 'Whether to collect the visitor phone number when Request User Data is enabled',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getFolders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const region = this.getNodeParameter('region', 0) as string;
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'workDriveOAuth2Api', {
					method: 'GET',
					url: `${getBaseUrl(region)}/privatespace/files`,
					headers: { Accept: 'application/vnd.api+json' },
				});
				const parsed = typeof response === 'string' ? JSON.parse(response) : response;
				return (parsed?.data ?? [])
					.filter((item: IDataObject) => (item.attributes as IDataObject)?.type === 'folder')
					.map((item: IDataObject) => ({
						name: String((item.attributes as IDataObject).name),
						value: String(item.id),
					}));
			},
		},
		listSearch: {
			async searchFolders(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				const region = this.getNodeParameter('region', 0) as string;
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'workDriveOAuth2Api', {
					method: 'GET',
					url: `${getBaseUrl(region)}/privatespace/files`,
					headers: { Accept: 'application/vnd.api+json' },
				});
				const parsed = typeof response === 'string' ? JSON.parse(response) : response;
				const results = (parsed?.data ?? [])
					.filter((item: IDataObject) => {
						const attrs = item.attributes as IDataObject;
						return attrs?.type === 'folder' && (!filter || String(attrs.name).toLowerCase().includes(filter.toLowerCase()));
					})
					.map((item: IDataObject) => ({
						name: String((item.attributes as IDataObject).name),
						value: String(item.id),
					}));
				return { results };
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const row = (json: IDataObject, binary?: INodeExecutionData['binary']): INodeExecutionData => ({
				json,
				pairedItem: { item: i },
				...(binary ? { binary } : {}),
			});

			try {
				const region    = this.getNodeParameter('region', i) as string;
				const resource  = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const baseUrl   = getBaseUrl(region);

				// ── API helpers ───────────────────────────────────────
				const apiGet = async (url: string, qs?: IDataObject) => {
					const raw = (await this.helpers.httpRequestWithAuthentication.call(this, 'workDriveOAuth2Api', {
						method: 'GET',
						url,
						headers: { Accept: 'application/vnd.api+json' },
						qs,
						returnFullResponse: true,
					})) as { statusCode: number; body: string };
					if (raw.statusCode === 401 || raw.statusCode === 403) {
						throw new NodeOperationError(this.getNode(),
							`Permission denied (${raw.statusCode}). Your account does not have access to this resource. Check your WorkDrive role and team membership.`,
							{ itemIndex: i });
					}
					if (raw.statusCode >= 400) throw new NodeOperationError(this.getNode(), `WorkDrive error ${raw.statusCode}: ${raw.body}`, { itemIndex: i });
					const parsed = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body;
					return parsed;
				};

				const apiWrite = async (method: 'POST' | 'PATCH' | 'DELETE', url: string, body?: IDataObject) => {
					const raw = (await this.helpers.httpRequestWithAuthentication.call(this, 'workDriveOAuth2Api', {
						method,
						url,
						headers: { Accept: 'application/vnd.api+json', 'Content-Type': 'application/vnd.api+json' },
						body: body ? JSON.stringify(body) : undefined,
						returnFullResponse: true,
					})) as { statusCode: number; body: string };
					if (raw.statusCode === 401 || raw.statusCode === 403) {
						throw new NodeOperationError(this.getNode(),
							`Permission denied (${raw.statusCode}). Your account does not have access to this resource. Check your WorkDrive role and team membership.`,
							{ itemIndex: i });
					}
					if (raw.statusCode >= 400) {
						let errorMsg = `WorkDrive error ${raw.statusCode}: ${raw.body}`;
						try {
							const errBody = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body;
							const errId    = errBody?.errors?.[0]?.id as string;
							const errTitle = errBody?.errors?.[0]?.title as string;
							const knownErrors: Record<string, string> = {
								'R509': 'Move failed: source and destination are the same folder. Enter a different Destination Folder ID.',
								'R501': 'Resource not found. Check that the ID is correct.',
								'R502': 'Permission denied. You do not have the required role for this action.',
								'R503': 'Destination folder not found. Check the Destination Folder ID.',
								'R504': 'A file with this name already exists. Enable "Keep Both" or rename first.',
							};
							errorMsg = knownErrors[errId] ?? errTitle ?? errorMsg;
						} catch { /* use raw errorMsg */ }
						throw new NodeOperationError(this.getNode(), errorMsg, { itemIndex: i });
					}
					if (!raw.body) return { success: true };
					return typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body;
				};

				// ── FILE operations ───────────────────────────────────
				if (resource === 'file') {

					if (operation === 'uploadFile') {
						const folderId          = this.getNodeParameter('folderId', i) as string;
						const fileName          = this.getNodeParameter('fileName', i, '') as string;
						const isBinaryData      = this.getNodeParameter('binaryData', i) as boolean;
						const overrideNameExist = this.getNodeParameter('overrideNameExist', i, 'true') as string;
						const uploadUrl         = getUploadUrl(region);
						// Resolve file buffer and metadata based on input mode
						let fileBuffer: Buffer;
						let uploadName: string;
						let uploadMime: string;

						const mimeMap: Record<string, string> = {
							pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
							gif: 'image/gif', txt: 'text/plain', csv: 'text/csv',
							xls: 'application/vnd.ms-excel',
							xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
							docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
							zip: 'application/zip', mp4: 'video/mp4',
						};

						if (isBinaryData) {
							const binaryProp = this.getNodeParameter('binaryPropertyName', i, 'data') as string;
							const binaryMeta = this.helpers.assertBinaryData(i, binaryProp);
							fileBuffer  = await this.helpers.getBinaryDataBuffer(i, binaryProp);
							uploadName  = fileName || binaryMeta.fileName || 'upload';
							uploadMime  = binaryMeta.mimeType ?? 'application/octet-stream';
						} else {
							const fileUrl = this.getNodeParameter('fileUrl', i, '') as string;
							if (!fileUrl) {
								throw new NodeOperationError(this.getNode(), 'Provide a File URL, or enable Binary File and connect a previous node that outputs binary data.', { itemIndex: i });
							}
							const fetched = (await this.helpers.httpRequest.call(this, {
								method: 'GET',
								url: fileUrl,
								returnFullResponse: true,
								encoding: 'arraybuffer',
							})) as { statusCode: number; body: ArrayBuffer | Buffer; headers: Record<string, string | string[] | undefined> };
							if (fetched.statusCode >= 400) {
								throw new NodeOperationError(this.getNode(), `Failed to fetch file from URL (${fetched.statusCode})`, { itemIndex: i });
							}
							const buf = fetched.body;
							fileBuffer = Buffer.isBuffer(buf) ? buf : Buffer.from(new Uint8Array(buf as ArrayBuffer));
							const urlTail = fileUrl.split('?')[0].split('/').pop() || 'upload';
							uploadName = fileName || urlTail;
							const ct = fetched.headers['content-type'];
							const ctStr = Array.isArray(ct) ? ct[0] : ct;
							uploadMime = ctStr?.split(';')[0].trim() ?? 'application/octet-stream';
							const ext = uploadName.includes('.') ? uploadName.split('.').pop()?.toLowerCase() : '';
							if (ext && mimeMap[ext]) uploadMime = mimeMap[ext];
						}

						const safeName = (uploadName || 'upload').trim() || 'upload';
						const safeType = (uploadMime || 'application/octet-stream').trim() || 'application/octet-stream';

						const form = new FormData();
						form.append('filename', encodeURIComponent(safeName));
						form.append('parent_id', folderId);
						form.append('override-name-exist', overrideNameExist);
						const blob = new Blob([new Uint8Array(fileBuffer)], { type: safeType });
						form.append('content', blob, safeName);

						const uploadRaw = (await this.helpers.httpRequestWithAuthentication.call(this, 'workDriveOAuth2Api', {
							method: 'POST',
							url: uploadUrl,
							body: form,
							returnFullResponse: true,
						})) as { statusCode: number; body: string };

						if (uploadRaw.statusCode >= 400) {
							throw new NodeOperationError(this.getNode(), `Upload failed (${uploadRaw.statusCode}): ${uploadRaw.body}`, { itemIndex: i });
						}
						const uploadResult = typeof uploadRaw.body === 'string' ? JSON.parse(uploadRaw.body) : uploadRaw.body;
						returnData.push(row(uploadResult as IDataObject));
					}

					else if (operation === 'downloadFile') {
						const resourceId = this.getNodeParameter('resourceId', i) as string;
						const outputProp = this.getNodeParameter('outputBinaryPropertyName', i) as string;
						let fileName = 'download', mimeType = 'application/octet-stream';
						try {
							const infoResp = await apiGet(`${baseUrl}/files/${resourceId}`);
							const attrs    = (infoResp?.data?.attributes ?? {}) as IDataObject;
							fileName  = (attrs.name as string) ?? 'download';
							mimeType  = (attrs.content_type as string) ?? 'application/octet-stream';
						} catch { /* use defaults */ }
						let fileBuffer: Buffer;
						try {
							const raw = await this.helpers.httpRequestWithAuthentication.call(this, 'workDriveOAuth2Api', {
								method: 'GET',
								url: `${getDownloadBaseUrl(region)}/download/${resourceId}`,
								encoding: 'arraybuffer',
							});
							fileBuffer = Buffer.isBuffer(raw) ? raw : Buffer.from(new Uint8Array(raw as ArrayBuffer));
						} catch (dlError) {
							const msg = (dlError as Error).message ?? '';
							if (msg.includes('INVALID_OAUTHSCOPE') || msg.includes('401')) {
								throw new NodeOperationError(this.getNode(),
									'Download requires the ZohoFiles.files.READ scope. Add this scope in your Zoho API Console app, then re-authenticate your credential.',
									{ itemIndex: i });
							}
							throw new NodeApiError(this.getNode(), { message: msg } as JsonObject, { itemIndex: i });
						}
						const binary = await this.helpers.prepareBinaryData(fileBuffer, fileName, mimeType);
						returnData.push(row({ resourceId, fileName, mimeType } as IDataObject, { [outputProp]: binary }));
					}

					else if (operation === 'getInfo') {
						const resourceId = this.getNodeParameter('resourceId', i) as string;
						const resp = await apiGet(`${baseUrl}/files/${resourceId}`);
						returnData.push(row((resp?.data ?? resp) as IDataObject));
					}

					else if (operation === 'copyResource') {
						const resourceId = this.getNodeParameter('resourceId', i) as string;
						const destId     = this.getNodeParameter('destinationFolderId', i) as string;
						const resp = await apiWrite('POST', `${baseUrl}/files/${destId}/copy`, {
							data: { attributes: { resource_id: resourceId }, type: 'files' },
						});
						returnData.push(row((resp?.data ?? resp) as IDataObject));
					}

					else if (operation === 'moveResource') {
						const resourceId = this.getNodeParameter('resourceId', i) as string;
						const destId     = this.getNodeParameter('destinationFolderId', i) as string;
						if (resourceId === destId) {
							throw new NodeOperationError(this.getNode(),
								'Move failed: the Resource ID and Destination Folder ID are identical.',
								{ itemIndex: i });
						}
						// Scope: WorkDrive.files.UPDATE
						// PATCH /api/v1/files/{resource_id} — same endpoint for files and folders
						const resp = await apiWrite('PATCH', `${baseUrl}/files/${resourceId}`, {
							data: { attributes: { parent_id: destId }, type: 'files' },
						});
						returnData.push(row((resp?.data ?? resp) as IDataObject));
					}

					else if (operation === 'renameResource') {
						const resourceId = this.getNodeParameter('resourceId', i) as string;
						const newName    = this.getNodeParameter('newName', i) as string;
						let resp: IDataObject;
						try {
							resp = await apiWrite('PATCH', `${baseUrl}/files/${resourceId}`, {
								data: { attributes: { name: newName }, id: resourceId, type: 'files' },
							});
						} catch {
							resp = await apiWrite('PATCH', `${baseUrl}/privatespace/files/${resourceId}`, {
								data: { attributes: { name: newName }, id: resourceId, type: 'files' },
							});
						}
						returnData.push(row((resp?.data ?? resp) as IDataObject));
					}

					else if (operation === 'deleteResource') {
						const resourceId = this.getNodeParameter('resourceId', i) as string;
						await apiWrite('PATCH', `${baseUrl}/files/${resourceId}`, {
							data: { attributes: { status: '51' }, id: resourceId, type: 'files' },
						});
						returnData.push(row({ deleted: true, resourceId } as IDataObject));
					}
				}

				// ── FOLDER operations ─────────────────────────────────
				else if (resource === 'folder') {

					if (operation === 'listFolder') {
						const folderId       = this.getNodeParameter('folderId', i) as string;
						const folderLocation = this.getNodeParameter('folderLocation', i, 'teamfolder') as string;
						const listType       = this.getNodeParameter('listType', i, 'files') as string;
						const opts           = this.getNodeParameter('listOptions', i, {}) as IDataObject;
						const returnAll      = (opts.returnAll as boolean) ?? false;
						const limit          = (opts.limit as number) ?? 50;
						const offset         = (opts.offset as number) ?? 0;
						const listUrl        = folderLocation === 'myfolders'
							? `${baseUrl}/privatespace/${folderId}/${listType}`
							: `${baseUrl}/files/${folderId}/${listType}`;

						if (returnAll) {
							let allData: IDataObject[] = [], currentOffset = 0;
							const pageSize = 100;
							while (true) {
								const resp  = await apiGet(listUrl, { 'page[limit]': pageSize, 'page[offset]': currentOffset });
								const batch = (resp?.data ?? []) as IDataObject[];
								allData = allData.concat(batch);
								if (batch.length < pageSize) break;
								currentOffset += pageSize;
							}
							if (allData.length === 0) {
								returnData.push(row({ message: `No ${listType} found. Folder may be empty or the ID may not be a folder.` } as IDataObject));
							} else {
								for (const item of allData) returnData.push(row(item));
							}
						} else {
							const resp  = await apiGet(listUrl, { 'page[limit]': limit, 'page[offset]': offset });
							const items = (resp?.data ?? []) as IDataObject[];
							if (items.length === 0) {
								returnData.push(row({ message: `No ${listType} found. The folder may be empty, or try switching Folder Location.` } as IDataObject));
							} else {
								for (const item of items) returnData.push(row(item));
							}
						}
					}

					else if (operation === 'createFolder') {
						const folderId   = this.getNodeParameter('folderId', i) as string;
						const folderName = this.getNodeParameter('folderName', i) as string;
						const resp = await apiWrite('POST', `${baseUrl}/files`, {
							data: { attributes: { name: folderName, parent_id: folderId }, type: 'files' },
						});
						returnData.push(row((resp?.data ?? resp) as IDataObject));
					}

					else if (operation === 'getInfo') {
						const resourceId = this.getNodeParameter('resourceId', i) as string;
						const resp = await apiGet(`${baseUrl}/files/${resourceId}`);
						returnData.push(row((resp?.data ?? resp) as IDataObject));
					}

					else if (operation === 'copyResource') {
						const resourceId = this.getNodeParameter('resourceId', i) as string;
						const destId     = this.getNodeParameter('destinationFolderId', i) as string;
						const resp = await apiWrite('POST', `${baseUrl}/files/${destId}/copy`, {
							data: { attributes: { resource_id: resourceId }, type: 'files' },
						});
						returnData.push(row((resp?.data ?? resp) as IDataObject));
					}

					else if (operation === 'moveResource') {
						// Same API as file move — PATCH /api/v1/files/{resource_id}
						const resourceId = this.getNodeParameter('resourceId', i) as string;
						const destId     = this.getNodeParameter('destinationFolderId', i) as string;
						if (resourceId === destId) {
							throw new NodeOperationError(this.getNode(),
								'Move failed: the Resource ID and Destination Folder ID are identical.',
								{ itemIndex: i });
						}
						const resp = await apiWrite('PATCH', `${baseUrl}/files/${resourceId}`, {
							data: { attributes: { parent_id: destId }, type: 'files' },
						});
						returnData.push(row((resp?.data ?? resp) as IDataObject));
					}

					else if (operation === 'renameResource') {
						const resourceId = this.getNodeParameter('resourceId', i) as string;
						const newName    = this.getNodeParameter('newName', i) as string;
						const resp = await apiWrite('PATCH', `${baseUrl}/files/${resourceId}`, {
							data: { attributes: { name: newName }, id: resourceId, type: 'files' },
						});
						returnData.push(row((resp?.data ?? resp) as IDataObject));
					}

					else if (operation === 'deleteResource') {
						const resourceId = this.getNodeParameter('resourceId', i) as string;
						await apiWrite('PATCH', `${baseUrl}/files/${resourceId}`, {
							data: { attributes: { status: '51' }, id: resourceId, type: 'files' },
						});
						returnData.push(row({ deleted: true, resourceId } as IDataObject));
					}
				}

				// ── SHARE operations ──────────────────────────────────
				else if (resource === 'share') {

					if (operation === 'createShare') {
						const resourceId      = this.getNodeParameter('resourceId', i) as string;
						const linkName        = this.getNodeParameter('linkName', i) as string;
						const roleId          = this.getNodeParameter('roleId', i, '34') as string;
						const allowDownload   = this.getNodeParameter('allowDownload', i, true) as boolean;
						const requestUserData = this.getNodeParameter('requestUserData', i, false) as boolean;
						const shareOpts       = this.getNodeParameter('shareOptions', i, {}) as IDataObject;

						const attributes: IDataObject = {
							resource_id:       resourceId,
							link_name:         linkName,
							role_id:           parseInt(roleId, 10),
							allow_download:    allowDownload,
							request_user_data: requestUserData,
						};

						if (requestUserData) {
							const inputFields: IDataObject[] = [];
							if (shareOpts.Name  !== false) inputFields.push({ field_name: 'Name',  field_type: 'TEXT', is_name_field: true });
							if (shareOpts.Email !== false) inputFields.push({ field_name: 'Email', field_type: 'EMAIL_ID' });
							if (shareOpts.Phone !== false) inputFields.push({ field_name: 'Phone', field_type: 'PHONE' });
							if (inputFields.length > 0) attributes.input_fields = inputFields;
						}

						if (shareOpts.password_text)   attributes.password_text   = shareOpts.password_text;
						if (shareOpts.expiration_date) attributes.expiration_date = shareOpts.expiration_date;

						const resp = await apiWrite('POST', `${baseUrl}/links`, {
							data: { attributes, type: 'links' },
						});
						returnData.push(row((resp?.data ?? resp) as IDataObject));
					}

					else if (operation === 'getShare') {
						const shareLinkId = this.getNodeParameter('shareLinkId', i) as string;
						const resp = await apiGet(`${baseUrl}/links/${shareLinkId}`);
						returnData.push(row((resp?.data ?? resp) as IDataObject));
					}

					else if (operation === 'deleteShare') {
						const shareLinkId = this.getNodeParameter('shareLinkId', i) as string;
						await apiWrite('DELETE', `${baseUrl}/links/${shareLinkId}`);
						returnData.push(row({ deleted: true, shareLinkId } as IDataObject));
					}
				}

			} catch (error) {
				const err = error as Error & { statusCode?: number };
				if (this.continueOnFail()) {
					returnData.push(row({ error: err.message } as IDataObject));
					continue;
				}
				if (error instanceof NodeOperationError || error instanceof NodeApiError) {
					const typed = error;
					throw typed;
				}
				throw new NodeApiError(this.getNode(), { message: err.message } as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
