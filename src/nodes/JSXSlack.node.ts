import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeTypeDescription, INodeExecutionData, INodeType } from 'n8n-workflow';
import { jsxslack } from '@speee-js/jsx-slack';

interface ChatPostMessage extends IDataObject {
  token: string;
  channel: string;
  blocks: {};
  as_user?: boolean;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
  link_names?: boolean;
  mrkdwn?: boolean;
  parse?: 'none' | 'full';
  reply_broadcast?: boolean;
  thread_ts?: number;
  unfurl_links?: boolean;
  text?: string;
}

export class JSXSlack implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'JSX Slack',
    name: 'jsx-slack',
    icon: 'file:slack.png',
    group: ['output'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Posts message to Slack (Specialized for Block Kit)',
    defaults: {
      name: 'JSX-Slack',
      color: '#BB2244',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'slackApi',
        required: true,
      },
    ],
    properties: [
      // ----------------------------------
      {
        displayName: 'Channel',
        name: 'channel',
        type: 'string',
        default: '',
        placeholder: 'Channel name',
        required: true,
        description: 'The channel to send the message to.',
      },
      {
        displayName: 'Blocks',
        name: 'blocks',
        type: 'string',
        typeOptions: {
          alwaysOpenEditWindow: true,
        },
        default: '<Blocks></Blocks>',
        placeholder: 'JSX-Slack',
        required: true,
        description: 'The block definition to send.',
      },
      {
        displayName: 'As User',
        name: 'as_user',
        type: 'boolean',
        default: false,
        description: 'Post the message as authenticated user instead of bot.',
      },
      {
        displayName: 'User Name',
        name: 'username',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            as_user: [false],
          },
        },
        description: "Set the bot's user name.",
      },
      {
        displayName: 'Other Options',
        name: 'otherOptions',
        type: 'collection',
        default: {},
        description: 'Other options to set',
        placeholder: 'Add options',
        options: [
          {
            displayName: 'Text',
            name: 'text',
            type: 'string',
            typeOptions: {
              alwaysOpenEditWindow: true,
            },
            default: '',
            description: 'The text to send.',
          },
          {
            displayName: 'Icon Emoji',
            name: 'icon_emoji',
            type: 'string',
            default: '',
            description: 'Emoji to use as the icon for this message. Overrides icon_url.',
          },
          {
            displayName: 'Icon URL',
            name: 'icon_url',
            type: 'string',
            default: '',
            description: 'URL to an image to use as the icon for this message.',
          },
          {
            displayName: 'Make Reply',
            name: 'thread_ts',
            type: 'string',
            default: '',
            description: "Provide another message's ts value to make this message a reply.",
          },
          {
            displayName: 'Unfurl Links',
            name: 'unfurl_links',
            type: 'boolean',
            default: false,
            description: 'Pass true to enable unfurling of primarily text-based content.',
          },
          {
            displayName: 'Unfurl Media',
            name: 'unfurl_media',
            type: 'boolean',
            default: true,
            description: 'Pass false to disable unfurling of media content.',
          },
          {
            displayName: 'Markdown',
            name: 'mrkdwn',
            type: 'boolean',
            default: true,
            description: 'Use Slack Markdown parsing.',
          },
          {
            displayName: 'Reply Broadcast',
            name: 'reply_broadcast',
            type: 'boolean',
            default: false,
            description:
              'Used in conjunction with thread_ts and indicates whether reply should be made visible to everyone in the channel or conversation.',
          },
          {
            displayName: 'Link Names',
            name: 'link_names',
            type: 'boolean',
            default: false,
            description: 'Find and link channel names and usernames.',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: IDataObject[] = [];

    const credentials = this.getCredentials('slackApi');

    if (credentials === undefined) {
      throw new Error('No credentials got returned!');
    }

    const baseUrl = `https://slack.com/api/`;
    let requestMethod = 'POST';

    // For Post
    let body: ChatPostMessage;
    // For Query string
    let qs: IDataObject;

    for (let i = 0; i < items.length; i++) {
      let endpoint = '';
      body = {} as ChatPostMessage;
      qs = {};

      // ----------------------------------
      //         message:post
      // ----------------------------------

      requestMethod = 'POST';
      endpoint = 'chat.postMessage';

      body.channel = this.getNodeParameter('channel', i) as string;
      body.as_user = this.getNodeParameter('as_user', i) as boolean;
      if (body.as_user === false) {
        body.username = this.getNodeParameter('username', i) as string;
      }
      const rawBlocks = this.getNodeParameter('blocks', i) as string;
      body.blocks = jsxslack(([rawBlocks.trim()] as unknown) as TemplateStringsArray);

      // Add all the other options to the request
      const otherOptions = this.getNodeParameter('otherOptions', i) as IDataObject;
      Object.assign(body, otherOptions);

      const options = {
        method: requestMethod,
        body,
        qs,
        uri: `${baseUrl}/${endpoint}`,
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'content-type': 'application/json; charset=utf-8',
        },
        json: true,
      };

      const responseData = await this.helpers.request(options);

      if (!responseData.ok) {
        throw new Error(`Request to Slack did fail with error: "${responseData.error}"`);
      }

      returnData.push(responseData as IDataObject);
    }

    return [this.helpers.returnJsonArray(returnData)];
  }
}
