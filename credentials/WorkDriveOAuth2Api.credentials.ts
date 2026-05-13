import type {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WorkDriveOAuth2Api implements ICredentialType {
	name = 'workDriveOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'Zoho WorkDrive OAuth2 API';
	icon = 'file:workdrive.svg' as const;
	documentationUrl = 'https://github.com/ZohoWorkDrive/n8n-nodes-workdrive';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'options',
			options: [
				{
					name: 'US / Global — https://accounts.zoho.com/oauth/v2/auth',
					value: 'https://accounts.zoho.com/oauth/v2/auth',
				},
				{
					name: 'Europe — https://accounts.zoho.eu/oauth/v2/auth',
					value: 'https://accounts.zoho.eu/oauth/v2/auth',
				},
				{
					name: 'India — https://accounts.zoho.in/oauth/v2/auth',
					value: 'https://accounts.zoho.in/oauth/v2/auth',
				},
				{
					name: 'Australia — https://accounts.zoho.com.au/oauth/v2/auth',
					value: 'https://accounts.zoho.com.au/oauth/v2/auth',
				},
				{
					name: 'Canada — https://accounts.zohocloud.ca/oauth/v2/auth',
					value: 'https://accounts.zohocloud.ca/oauth/v2/auth',
				},
				{
					name: 'Japan — https://accounts.zoho.jp/oauth/v2/auth',
					value: 'https://accounts.zoho.jp/oauth/v2/auth',
				},
			],
			default: 'https://accounts.zoho.com/oauth/v2/auth',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'options',
			options: [
				{
					name: 'US / Global — https://accounts.zoho.com/oauth/v2/token',
					value: 'https://accounts.zoho.com/oauth/v2/token',
				},
				{
					name: 'Europe — https://accounts.zoho.eu/oauth/v2/token',
					value: 'https://accounts.zoho.eu/oauth/v2/token',
				},
				{
					name: 'India — https://accounts.zoho.in/oauth/v2/token',
					value: 'https://accounts.zoho.in/oauth/v2/token',
				},
				{
					name: 'Australia — https://accounts.zoho.com.au/oauth/v2/token',
					value: 'https://accounts.zoho.com.au/oauth/v2/token',
				},
				{
					name: 'Canada — https://accounts.zohocloud.ca/oauth/v2/token',
					value: 'https://accounts.zohocloud.ca/oauth/v2/token',
				},
				{
					name: 'Japan — https://accounts.zoho.jp/oauth/v2/token',
					value: 'https://accounts.zoho.jp/oauth/v2/token',
				},
			],
			default: 'https://accounts.zoho.com/oauth/v2/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'WorkDrive.files.ALL,WorkDrive.workspace.ALL,WorkDrive.links.ALL,ZohoFiles.files.READ,WorkDrive.users.READ',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'access_type=offline&prompt=consent',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.accessTokenUrl.includes("zoho.eu") ? "https://www.zohoapis.eu/workdrive/api/v1" : $credentials.accessTokenUrl.includes("zoho.in") ? "https://www.zohoapis.in/workdrive/api/v1" : $credentials.accessTokenUrl.includes("zoho.com.au") ? "https://www.zohoapis.com.au/workdrive/api/v1" : $credentials.accessTokenUrl.includes("zohocloud.ca") ? "https://www.zohoapis.ca/workdrive/api/v1" : $credentials.accessTokenUrl.includes("zoho.jp") ? "https://www.zohoapis.jp/workdrive/api/v1" : "https://www.zohoapis.com/workdrive/api/v1"}}',
			url: '/currentuser',
			method: 'GET',
			headers: {
				Accept: 'application/vnd.api+json',
			},
		},
	};
}
