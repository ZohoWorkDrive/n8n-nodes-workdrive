import { createHmac, timingSafeEqual } from 'crypto';

import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

// ─── Event definitions per category ─────────────────────────────────────────
// Mirrors the 4 tabs in WorkDrive Admin Console → Webhooks:
// Team | Team Folder | Folder | File
// Note: You can choose multiple events within a category,
//       but not across different categories.

const FILE_EVENTS = [
	{ name: 'File Viewed',                        value: 'file_read',                       description: 'When the selected file is opened' },
	{ name: 'File Moved to Trash',                value: 'file_trash',                      description: 'When the selected file is moved to trash' },
	{ name: 'File Restored',                      value: 'file_restore',                    description: 'When the selected file is restored from trash' },
	{ name: 'File Deleted From Trash',            value: 'file_delete',                     description: 'When the selected file is deleted from trash' },
	{ name: 'File Copied',                        value: 'file_copy',                       description: 'When the selected file is copied' },
	{ name: 'File Moved',                         value: 'file_move',                       description: 'When the selected file is moved' },
	{ name: 'File Renamed',                       value: 'file_rename',                     description: 'When the selected file is renamed' },
	{ name: 'File Downloaded',                    value: 'file_download',                   description: 'When the selected file is downloaded' },
	{ name: 'File Shared',                        value: 'file_create_share',               description: 'When access is provided for a user to the selected file' },
	{ name: 'File Sharing Updated',               value: 'file_update_share',               description: 'When access is updated for a user in the selected file' },
	{ name: 'File Sharing Removed',               value: 'file_delete_share',               description: 'When access is revoked for a user in the selected file' },
	{ name: 'Comment Created',                    value: 'file_create_comment',             description: 'When a comment is added on the selected file' },
	{ name: 'Comment Updated',                    value: 'file_update_comment',             description: 'When a comment is updated on the selected file' },
	{ name: 'Comment Deleted',                    value: 'file_delete_comment',             description: 'When a comment is deleted on the selected file' },
	{ name: 'External Share Link Created',        value: 'file_create_link',                description: 'When an external share link is created for the selected file' },
	{ name: 'External Share Link Updated',        value: 'file_update_link',                description: 'When an external share link settings are updated for the selected file' },
	{ name: 'External Share Link Deleted',        value: 'file_delete_link',                description: 'When an external share link is deleted for the selected file' },
];

const FOLDER_EVENTS = [
	{ name: 'Zoho Native File Created',           value: 'file_create',                     description: 'When a Zoho native file (Writer, Sheet, or Show) is created inside the selected folder or its subfolders' },
	{ name: 'File Uploaded',                      value: 'file_upload',                     description: 'When a file is uploaded inside the selected folder or its subfolders' },
	{ name: 'File Moved to Trash',                value: 'file_trash',                      description: 'When a file is moved to trash from the selected folder or its subfolders' },
	{ name: 'File Restored',                      value: 'file_restore',                    description: 'When a file is restored from trash to the selected folder or its subfolders' },
	{ name: 'File Deleted From Trash',            value: 'file_delete',                     description: 'When a file is deleted from trash in the selected folder or its subfolders' },
	{ name: 'File Copied',                        value: 'file_copy',                       description: 'When a file is copied inside the selected folder or its subfolders' },
	{ name: 'File Moved',                         value: 'file_move',                       description: 'When a file is moved inside the selected folder or its subfolders' },
	{ name: 'File Downloaded',                    value: 'file_download',                   description: 'When a file is downloaded from the selected folder or its subfolders' },
	{ name: 'File Renamed',                       value: 'file_rename',                     description: 'When a file is renamed inside the selected folder or its subfolders' },
	{ name: 'File Shared',                        value: 'file_create_share',               description: 'When a user is provided access to a file in the selected folder or its subfolders' },
	{ name: 'File Sharing Updated',               value: 'file_update_share',               description: 'When a user access is updated to a file in the selected folder or its subfolders' },
	{ name: 'File Sharing Deleted',               value: 'file_delete_share',               description: 'When a user access is revoked to a file in the selected folder or its subfolders' },
	{ name: 'File External Share Link Created',   value: 'file_create_link',                description: 'When an external share link is created in a file in the selected folder or its subfolders' },
	{ name: 'File External Share Link Updated',   value: 'file_update_link',                description: 'When external share link settings are updated in a file in the selected folder or its subfolders' },
	{ name: 'File External Share Link Deleted',   value: 'file_delete_link',                description: 'When an external share link is deleted for a file in the selected folder or its subfolders' },
	{ name: 'Folder Created',                     value: 'folder_create',                   description: 'When a folder is created inside the selected folder or its subfolders' },
	{ name: 'Folder Moved to Trash',              value: 'folder_trash',                    description: 'When the selected folder or its subfolders are moved to trash' },
	{ name: 'Folder Restored',                    value: 'folder_restore',                  description: 'When the selected folder or its subfolders are restored from trash' },
	{ name: 'Folder Deleted From Trash',          value: 'folder_delete',                   description: 'When the selected folder or its subfolders are deleted from trash' },
	{ name: 'Folder Copied',                      value: 'folder_copy',                     description: 'When a folder is copied inside the selected folder or its subfolders' },
	{ name: 'Folder Moved',                       value: 'folder_move',                     description: 'When a folder is moved inside the selected folder or its subfolders' },
	{ name: 'Folder Uploaded',                    value: 'folder_upload',                   description: 'When a folder is uploaded inside the selected folder or its subfolders' },
	{ name: 'Folder Downloaded',                  value: 'folder_download',                 description: 'When the selected folder or its subfolders are downloaded' },
	{ name: 'Folder Renamed',                     value: 'folder_rename',                   description: 'When the selected folder or its subfolders are renamed' },
	{ name: 'Folder Shared',                      value: 'folder_create_share',             description: 'When access is provided for a user to the selected folder or its subfolders' },
	{ name: 'Folder Sharing Updated',             value: 'folder_update_share',             description: 'When access is updated for a user to the selected folder or its subfolders' },
	{ name: 'Folder Sharing Deleted',             value: 'folder_delete_share',             description: 'When access is revoked for a user to the selected folder or its subfolders' },
	{ name: 'Folder External Share Link Created', value: 'folder_create_link',              description: 'When an external share link is created for the selected folder or its subfolders' },
	{ name: 'Folder External Share Link Updated', value: 'folder_update_link',              description: 'When external share link settings are updated for the selected folder or its subfolders' },
	{ name: 'Folder External Share Link Deleted', value: 'folder_delete_link',              description: 'When an external share link is deleted for the selected folder or its subfolders' },
];

const TEAM_FOLDER_EVENTS = [
	{ name: 'Team Folder Renamed',                value: 'teamfolder_rename',                description: 'When the selected team folder is renamed' },
	{ name: 'Team Folder Deleted',                value: 'teamfolder_delete',                description: 'When the selected team folder is deleted' },
	{ name: 'Member Added',                       value: 'teamfolder_create_share',           description: 'When a member is added to the selected team folder' },
	{ name: 'Member Role Updated',                value: 'teamfolder_update_share',           description: "When a member's role is updated in the selected team folder" },
	{ name: 'Member Deleted',                     value: 'teamfolder_delete_share',           description: 'When a member is removed from the selected team folder' },
	{ name: 'Folder Created',                     value: 'folder_create',                    description: 'When a folder is created inside the selected team folder or its subfolders' },
	{ name: 'Folder Moved to Trash',              value: 'folder_trash',                     description: 'When a subfolder of the selected team folder is moved to trash' },
	{ name: 'Folder Restored',                    value: 'folder_restore',                   description: 'When a folder is restored from trash in the selected team folder or its subfolders' },
	{ name: 'Folder Deleted From Trash',          value: 'folder_delete',                    description: 'When a folder is deleted from trash in the selected team folder or its subfolders' },
	{ name: 'Folder Copied',                      value: 'folder_copy',                      description: 'When a folder is copied inside the selected team folder or its subfolders' },
	{ name: 'Folder Moved',                       value: 'folder_move',                      description: 'When a folder is moved inside the selected team folder or its subfolders' },
	{ name: 'Folder Uploaded',                    value: 'folder_upload',                    description: 'When a folder is uploaded inside the selected team folder or its subfolders' },
	{ name: 'Folder Downloaded',                  value: 'folder_download',                  description: 'When a folder is downloaded from the selected team folder or its subfolders' },
	{ name: 'Folder Renamed',                     value: 'folder_rename',                    description: 'When the selected team folder or its subfolders are renamed' },
	{ name: 'Folder Shared',                      value: 'folder_create_share',              description: 'When access is provided for a user to a folder inside the selected team folder or its subfolders' },
	{ name: 'Folder Sharing Updated',             value: 'folder_update_share',              description: 'When access is updated for a user to a folder inside the selected team folder or its subfolders' },
	{ name: 'Folder Sharing Deleted',             value: 'folder_delete_share',              description: 'When access is revoked for a user to a folder inside the selected team folder or its subfolders' },
	{ name: 'Folder External Share Link Created', value: 'folder_create_link',               description: 'When an external share link is created for a folder inside the selected team folder or its subfolders' },
	{ name: 'Folder External Share Link Updated', value: 'folder_update_link',               description: 'When external share link settings are updated for a folder inside the selected team folder or its subfolders' },
	{ name: 'Folder External Share Link Deleted', value: 'folder_delete_link',               description: 'When an external share link is deleted for a folder inside the selected team folder or its subfolders' },
	{ name: 'Zoho Native File Created',           value: 'file_create',                      description: 'When a Zoho native file (Writer, Sheet, or Show) is created inside the selected team folder or its subfolders' },
	{ name: 'File Uploaded',                      value: 'file_upload',                      description: 'When a file is uploaded inside the selected team folder or its subfolders' },
	{ name: 'File Moved to Trash',                value: 'file_trash',                       description: 'When a file is moved to trash in selected team folder or its subfolders' },
	{ name: 'File Restored',                      value: 'file_restore',                     description: 'When a file is restored from trash to the selected team folder or its subfolders' },
	{ name: 'File Deleted From Trash',            value: 'file_delete',                      description: 'When a file is deleted from trash in the selected team folder or its subfolders' },
	{ name: 'File Copied',                        value: 'file_copy',                        description: 'When a file is copied inside the selected team folder or its subfolders' },
	{ name: 'File Moved',                         value: 'file_move',                        description: 'When a file is moved inside the selected team folder or its subfolders' },
	{ name: 'File Downloaded',                    value: 'file_download',                    description: 'When a file is downloaded from the selected team folder or its subfolders' },
	{ name: 'File Renamed',                       value: 'file_rename',                      description: 'When a file is renamed inside the selected team folder or its subfolders' },
	{ name: 'File Shared',                        value: 'file_create_share',                description: 'When a user is provided access to a file in the selected team folder or its subfolders' },
	{ name: 'File Sharing Updated',               value: 'file_update_share',                description: "When a user's access is updated for a file in the selected team folder or its subfolders" },
	{ name: 'File Sharing Deleted',               value: 'file_delete_share',                description: "When a user's access is revoked to a file in the selected team folder or its subfolders" },
	{ name: 'File External Share Link Created',   value: 'file_create_link',                 description: 'When an external share link is created in a file in the selected team folder or its subfolders' },
	{ name: 'File External Share Link Updated',   value: 'file_update_link',                 description: 'When external share link settings are updated in a file in the selected team folder or its subfolders' },
	{ name: 'File External Share Link Deleted',   value: 'file_delete_link',                 description: 'When an external share link is deleted for a file in the selected team folder or its subfolders' },
];

const TEAM_EVENTS = [
	{ name: 'Team Renamed',                       value: 'team_rename',                      description: 'When a team is renamed' },
	{ name: 'User Added to Team',                 value: 'user_add',                         description: 'When a user is added to the team' },
	{ name: 'User Removed From Team',             value: 'user_remove',                      description: 'When a user is removed from team' },
	{ name: 'User Role Updated in Team',          value: 'user_role_change',                 description: "When a user's team role is updated" },
	{ name: 'Team Folder Created',                value: 'teamfolder_create',                description: 'When a team folder is created' },
];

export class WorkDriveTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zoho WorkDrive Trigger',
		name: 'workDriveTrigger',
		icon: 'file:workdrive.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["category"]}}',
		description: 'Starts a workflow when a Zoho WorkDrive event occurs (requires WorkDrive Business plan)',
		defaults: { name: 'WorkDrive Trigger' },
		usableAsTool: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'workDriveOAuth2Api',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'workdrive',
			},
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: 'workdrive',
			},
		],
		properties: [

			// ── Business plan notice ─────────────────────────────────────
			{
				displayName: 'WorkDrive webhooks are Supported on the <strong>Business</strong> plan only. <a href="https://www.zoho.com/workdrive/pricing.html" target="_blank">Check your plan</a>',
				name: 'businessPlanNotice',
				type: 'notice',
				default: '',
			},

			// ── Category ─────────────────────────────────────────────────
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				required: true,
				default: 'teamFolder',
				description: 'The scope of the webhook — matches the tab in WorkDrive Admin Console. You can only select events from one category per webhook.',
				options: [
					{ name: 'File',        value: 'file',       description: 'Events on a specific file' },
					{ name: 'Folder',      value: 'folder',     description: 'File and folder events inside a specific folder and its subfolders' },
					{ name: 'Team',        value: 'team',       description: 'Team-wide membership and structure events' },
					{ name: 'Team Folder', value: 'teamFolder', description: 'File and folder events inside a specific team folder and its subfolders' },
				],
			},

			// ── Events: File ─────────────────────────────────────────────
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'One or more events to listen for within this category',
				displayOptions: { show: { category: ['file'] } },
				options: FILE_EVENTS.map(e => ({ name: e.name, value: e.value, description: e.description })),
			},

			// ── Events: Folder ───────────────────────────────────────────
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'One or more events to listen for within this category',
				displayOptions: { show: { category: ['folder'] } },
				options: FOLDER_EVENTS.map(e => ({ name: e.name, value: e.value, description: e.description })),
			},

			// ── Events: Team Folder ──────────────────────────────────────
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'One or more events to listen for within this category',
				displayOptions: { show: { category: ['teamFolder'] } },
				options: TEAM_FOLDER_EVENTS.map(e => ({ name: e.name, value: e.value, description: e.description })),
			},

			// ── Events: Team ─────────────────────────────────────────────
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'One or more events to listen for within this category',
				displayOptions: { show: { category: ['team'] } },
				options: TEAM_EVENTS.map(e => ({ name: e.name, value: e.value, description: e.description })),
			},

			// ── Setup instructions ───────────────────────────────────────
			{
				displayName: 'Setup Instructions',
				name: 'setupNotice',
				type: 'notice',
				default: '',
				description: '<p><strong>Manual setup:</strong> Activate the workflow and copy the <strong>Production URL</strong> (<code>/webhook/</code>) into WorkDrive. Use <strong>Test URL</strong> (<code>/webhook-test/</code>) only while &quot;Listen for test event&quot; is on. Set <code>WEBHOOK_URL</code> to your public HTTPS base (e.g. ngrok) so URLs are not <code>localhost</code>. WorkDrive sends GET to validate the endpoint.</p><p>Payload reference: <a href="https://help.zoho.com/portal/en/kb/workdrive/integrations/webhooks/articles/setting-up-webhooks-in-workdrive-using-custom-apps#Webhooks_payload" target="_blank" rel="noopener noreferrer">Webhooks payload</a>.</p>.',
			},

			// ── Options ──────────────────────────────────────────────────
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'App Secret',
						name: 'appSecret',
						type: 'string',
						typeOptions: { password: true },
						default: '',
						description: 'Secret key from the WorkDrive Admin Console App details tab. When set, the HMAC-SHA256 signature in the X-ZWDWEBHOOK-SIGNATURE header is verified and requests with an invalid signature are rejected with 401.',
					},
					{
						displayName: 'Return Raw Payload',
						name: 'rawPayload',
						type: 'boolean',
						default: false,
						description: 'Whether to return the full unmodified payload from WorkDrive instead of the normalised output',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
		setup: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();

		if (req.method === 'GET') {
			res.status(200).send('OK');
			return { noWebhookResponse: true };
		}

		const selectedEvents = this.getNodeParameter('events', []) as string[];
		const options        = this.getNodeParameter('options', {}) as IDataObject;

		// ── Signature verification ───────────────────────────────────────────
		// WorkDrive signs every POST with X-ZWDWEBHOOK-SIGNATURE in JWS format:
		// <base64(header)>.<base64(payload)>.<base64(HMAC-SHA256(header.payload, secret))>
		const appSecret = (options.appSecret as string) ?? '';
		if (appSecret) {
			const rawSig = req.headers['x-zwdwebhook-signature'] as string | undefined;
			if (!rawSig) {
				res.status(401).send('Missing signature');
				return { noWebhookResponse: true };
			}
			const parts = rawSig.split('.');
			if (parts.length !== 3) {
				res.status(401).send('Invalid signature format');
				return { noWebhookResponse: true };
			}
			const [b64Header, b64Body, b64Sig] = parts;
			const computed = createHmac('sha256', appSecret)
				.update(`${b64Header}.${b64Body}`)
				.digest('base64');
			const computedBuf = Buffer.from(computed);
			const receivedBuf = Buffer.from(b64Sig);
			const sigValid =
				computedBuf.length === receivedBuf.length &&
				timingSafeEqual(computedBuf, receivedBuf);
			if (!sigValid) {
				res.status(401).send('Invalid signature');
				return { noWebhookResponse: true };
			}
		}

		let body: IDataObject = {};
		try {
			body = (typeof req.body === 'string'
				? JSON.parse(req.body as string)
				: req.body) as IDataObject;
		} catch {
			body = req.body as IDataObject;
		}

		if (options.rawPayload === true) {
			return { workflowData: [this.helpers.returnJsonArray([body])] };
		}

		const dataArray = Array.isArray(body.data)
			? (body.data as IDataObject[])
			: [body];

		const outputItems: IDataObject[] = [];

		for (const eventItem of dataArray) {
			const incomingEvent = (eventItem.event_type as string) ?? '';

			if (selectedEvents.length > 0 && !selectedEvents.includes(incomingEvent)) {
				continue;
			}

			outputItems.push({
				event_type:       incomingEvent,
				event_id:         eventItem.event_id         ?? null,
				event_time:       eventItem.event_time       ?? null,
				event_by:         eventItem.event_by         ?? null,
				portal_id:        eventItem.portal_id        ?? null,
				team_id:          eventItem.team_id          ?? null,
				webhook_id:       eventItem.webhook_id       ?? null,
				app_key:          eventItem.app_key          ?? null,
				type:             eventItem.type             ?? null,
				module_name:      eventItem.module_name      ?? null,
				resource_info:    eventItem.resource_info    ?? null,
				share_info:       eventItem.share_info       ?? null,
				association_info: eventItem.association_info ?? null,
			});
		}

		if (outputItems.length === 0) {
			// Always acknowledge receipt so WorkDrive doesn't retry or mark the webhook as failed.
			res.status(200).send('');
			return { noWebhookResponse: true };
		}

		return {
			workflowData: [this.helpers.returnJsonArray(outputItems)],
		};
	}
}
