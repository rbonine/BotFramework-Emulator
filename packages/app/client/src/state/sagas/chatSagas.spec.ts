//
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
//
// Microsoft Bot Framework: http://botframework.com
//
// Bot Framework Emulator Github:
// https://github.com/Microsoft/BotFramwork-Emulator
//
// Copyright (c) Microsoft Corporation
// All rights reserved.
//
// MIT License:
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { call, put, select, takeEvery } from 'redux-saga/effects';
import { CommandServiceImpl, CommandServiceInstance, ConversationService } from '@bfemulator/sdk-shared';
import * as sdkSharedUtils from '@bfemulator/sdk-shared/build/utils/misc';
import {
  clearLog,
  closeConversation,
  closeDocument,
  newChat,
  open as openDocument,
  openTranscript,
  restartConversation,
  setInspectorObjects,
  webChatStoreUpdated,
  webSpeechFactoryUpdated,
  updatePendingSpeechTokenRetrieval,
  ChatActions,
  SharedConstants,
} from '@bfemulator/app-shared';
import { createCognitiveServicesSpeechServicesPonyfillFactory } from 'botframework-webchat';

import {
  chatSagas,
  ChatSagas,
  getConversationIdFromDocumentId,
  getChatFromDocumentId,
  getServerUrl,
  getCustomUserGUID,
  getWebSpeechFactoryForDocumentId,
} from './chatSagas';

const mockWebChatStore = {};
jest.mock('botframework-webchat-core', () => ({
  createStore: () => mockWebChatStore,
}));

jest.mock('../../ui/dialogs', () => ({}));

const mockWriteText = jest.fn();
jest.mock('electron', () => {
  return {
    ipcMain: new Proxy(
      {},
      {
        get(): any {
          return () => ({});
        },
        has() {
          return true;
        },
      }
    ),
    ipcRenderer: new Proxy(
      {},
      {
        get(): any {
          return () => ({});
        },
        has() {
          return true;
        },
      }
    ),
    clipboard: { writeText: (textFromActivity: string) => mockWriteText(textFromActivity) },
  };
});

jest.mock('botframework-webchat', () => {
  return {
    createCognitiveServicesSpeechServicesPonyfillFactory: () => () => 'Yay! ponyfill!',
  };
});

describe('The ChatSagas,', () => {
  let commandService: CommandServiceImpl;
  beforeAll(() => {
    const decorator = CommandServiceInstance();
    const descriptor = decorator({ descriptor: {} }, 'none') as any;
    commandService = descriptor.descriptor.get();
    commandService.call = jest.fn().mockResolvedValue(true);
    commandService.remoteCall = jest.fn().mockResolvedValue(true);
    jest.spyOn(sdkSharedUtils, 'uniqueId').mockReturnValue('someUniqueId');
    jest.spyOn(sdkSharedUtils, 'uniqueIdv4').mockReturnValue('someUniqueIdv4');
  });

  beforeEach(() => {
    mockWriteText.mockClear();
  });

  it('should initialize the root saga', () => {
    const gen = chatSagas();

    expect(gen.next().value).toEqual(
      takeEvery(ChatActions.showContextMenuForActivity, ChatSagas.showContextMenuForActivity)
    );
    expect(gen.next().value).toEqual(takeEvery(ChatActions.closeConversation, ChatSagas.closeConversation));
    expect(gen.next().value).toEqual(takeEvery(ChatActions.restartConversation, ChatSagas.restartConversation));
    expect(gen.next().value).toEqual(takeEvery(ChatActions.openTranscript, ChatSagas.newTranscript));
    expect(gen.next().done).toBe(true);
  });

  describe('showContextMenuForActivity', () => {
    it('should show a context menu for an activity (cancel menu)', () => {
      const menuItems = [
        { label: 'Copy text', id: 'copy' },
        { label: 'Copy json', id: 'json' },
      ];
      const mockAction: any = {
        payload: {}, // activity
      };
      const gen = ChatSagas.showContextMenuForActivity(mockAction);
      expect(gen.next().value).toEqual(
        call(
          [commandService, commandService.remoteCall],
          SharedConstants.Commands.Electron.DisplayContextMenu,
          menuItems
        )
      ); // call
      expect(gen.next(undefined).done).toBe(true);
      expect(mockWriteText).not.toHaveBeenCalled();
    });

    it('should show a context menu for an acitivity (copy)', () => {
      const menuItems = [
        { label: 'Copy text', id: 'copy' },
        { label: 'Copy json', id: 'json' },
      ];
      const mockAction: any = {
        payload: {}, // activity
      };
      const gen = ChatSagas.showContextMenuForActivity(mockAction);
      expect(gen.next().value).toEqual(
        call(
          [commandService, commandService.remoteCall],
          SharedConstants.Commands.Electron.DisplayContextMenu,
          menuItems
        )
      ); // call
      expect(gen.next({ id: 'copy' }).done).toBe(true);
      expect(mockWriteText).toHaveBeenCalled();
    });

    it('should show a context menu for an acitivity (json)', () => {
      const menuItems = [
        { label: 'Copy text', id: 'copy' },
        { label: 'Copy json', id: 'json' },
      ];
      const mockAction: any = {
        payload: {}, // activity
      };
      const gen = ChatSagas.showContextMenuForActivity(mockAction);
      expect(gen.next().value).toEqual(
        call(
          [commandService, commandService.remoteCall],
          SharedConstants.Commands.Electron.DisplayContextMenu,
          menuItems
        )
      ); // call
      expect(gen.next({ id: 'json' }).done).toBe(true);
      expect(mockWriteText).toHaveBeenCalled();
    });

    it('should show a context menu for an acitivity (default)', () => {
      const menuItems = [
        { label: 'Copy text', id: 'copy' },
        { label: 'Copy json', id: 'json' },
      ];
      const mockAction: any = {
        payload: {}, // activity
      };
      const gen = ChatSagas.showContextMenuForActivity(mockAction);
      expect(gen.next().value).toEqual(
        call(
          [commandService, commandService.remoteCall],
          SharedConstants.Commands.Electron.DisplayContextMenu,
          menuItems
        )
      ); // call
      expect(gen.next({ id: 'something else' }).done).toBe(true);
      expect(mockWriteText).not.toHaveBeenCalled();
    });
  });

  describe('closeConversation', () => {
    it('should close a conversation', () => {
      const mockAction: any = {
        payload: {
          documentId: 'someDocId',
        },
      };
      const mockChat = {
        directLine: {
          end: jest.fn(),
        },
      };
      const gen = ChatSagas.closeConversation(mockAction);

      // select conversation id
      expect(gen.next().value).toEqual(select(getConversationIdFromDocumentId, mockAction.payload.documentId));

      // select chat
      expect(gen.next(mockAction.payload.documentId).value).toEqual(
        select(getChatFromDocumentId, mockAction.payload.documentId)
      );

      // put closeDocument
      expect(gen.next(mockChat).value).toEqual(put(closeDocument(mockAction.payload.documentId)));

      expect(mockChat.directLine.end).toHaveBeenCalled();

      // put webChatStoreUpdated
      expect(gen.next().value).toEqual(put(webChatStoreUpdated(mockAction.payload.documentId, null)));

      // call
      expect(gen.next().value).toEqual(
        call(
          [commandService, commandService.remoteCall],
          SharedConstants.Commands.Emulator.DeleteConversation,
          mockAction.payload.documentId
        )
      );

      expect(gen.next().done).toBe(true);
    });
  });

  describe('newTranscript', () => {
    it('should open a new transcript and parse activities from the file', () => {
      const filename = 'test.transcript';
      const serverUrl = 'http://localhost:52673';
      const userGUID = 'someUserId';
      const conversationId = 'someConvoId';
      const endpointId = 'someEndpointId';
      const mockAction: any = {
        payload: {
          filename,
        },
      };
      const gen = ChatSagas.newTranscript(mockAction);

      // select server url
      expect(gen.next().value).toEqual(select(getServerUrl));

      // select custom user GUID
      expect(gen.next(serverUrl).value).toEqual(select(getCustomUserGUID));

      // startConversation()
      expect(gen.next(userGUID).value).toEqual(
        call([ConversationService, ConversationService.startConversation], serverUrl, {
          botUrl: '',
          channelServiceType: '' as any,
          members: [{ id: userGUID, name: 'User', role: 'user' }],
          mode: 'transcript' as EmulatorMode,
          msaAppId: '',
          msaPassword: '',
        } as any)
      );

      // res.json()
      gen.next({ json: jest.fn(), ok: true });

      // remote call
      expect(gen.next({ conversationId, endpointId }).value).toEqual(
        call(
          [commandService, commandService.remoteCall],
          SharedConstants.Commands.Emulator.ExtractActivitiesFromFile,
          filename
        )
      );

      // bootstrapChat()
      const activities = [];
      expect(gen.next({ activities }).value).toEqual(
        call([ChatSagas, ChatSagas.bootstrapChat], {
          conversationId,
          documentId: conversationId,
          endpointId,
          mode: 'transcript',
          user: { id: userGUID, name: 'User', role: 'user' },
        } as any)
      );

      // put openDocument
      expect(gen.next().value).toEqual(
        put(
          openDocument({
            contentType: SharedConstants.ContentTypes.CONTENT_TYPE_TRANSCRIPT,
            documentId: conversationId,
            fileName: filename,
            isGlobal: false,
          })
        )
      );

      // call feedActivitiesAsTranscript()
      expect(gen.next().value).toEqual(
        call(
          [ConversationService, ConversationService.feedActivitiesAsTranscript],
          serverUrl,
          conversationId,
          activities
        )
      );

      gen.next({ ok: true });

      expect(gen.next().done).toBe(true);
    });

    it('should throw if starting a new conversation fails while opening a transcript', () => {
      const filename = 'test.transcript';
      const serverUrl = 'http://localhost:52673';
      const userGUID = 'someUserId';
      const mockAction: any = {
        payload: {
          filename,
        },
      };
      const gen = ChatSagas.newTranscript(mockAction);

      // select server url
      expect(gen.next().value).toEqual(select(getServerUrl));

      // select custom user GUID
      expect(gen.next(serverUrl).value).toEqual(select(getCustomUserGUID));

      // startConversation()
      expect(gen.next(userGUID).value).toEqual(
        call([ConversationService, ConversationService.startConversation], serverUrl, {
          botUrl: '',
          channelServiceType: '' as any,
          members: [{ id: userGUID, name: 'User', role: 'user' }],
          mode: 'transcript' as EmulatorMode,
          msaAppId: '',
          msaPassword: '',
        } as any)
      );

      // res.json()
      try {
        gen.next({ json: jest.fn(), ok: false, status: 500, statusText: 'INTERNAL SERVER ERROR' });
        expect(true).toBe(false); // ensure catch is hit
      } catch (e) {
        expect(e).toEqual(new Error('Error occurred while starting a new conversation: 500: INTERNAL SERVER ERROR'));
      }
    });

    it('should throw if feeding activities fails while opening a transcript', () => {
      const filename = 'test.transcript';
      const serverUrl = 'http://localhost:52673';
      const userGUID = 'someUserId';
      const conversationId = 'someConvoId';
      const endpointId = 'someEndpointId';
      const mockAction: any = {
        payload: {
          filename,
        },
      };
      const gen = ChatSagas.newTranscript(mockAction);

      // select server url
      expect(gen.next().value).toEqual(select(getServerUrl));

      // select custom user GUID
      expect(gen.next(serverUrl).value).toEqual(select(getCustomUserGUID));

      // startConversation()
      expect(gen.next(userGUID).value).toEqual(
        call([ConversationService, ConversationService.startConversation], serverUrl, {
          botUrl: '',
          channelServiceType: '' as any,
          members: [{ id: userGUID, name: 'User', role: 'user' }],
          mode: 'transcript' as EmulatorMode,
          msaAppId: '',
          msaPassword: '',
        } as any)
      );

      // res.json()
      gen.next({ json: jest.fn(), ok: true });

      // remote call
      expect(gen.next({ conversationId, endpointId }).value).toEqual(
        call(
          [commandService, commandService.remoteCall],
          SharedConstants.Commands.Emulator.ExtractActivitiesFromFile,
          filename
        )
      );

      // bootstrapChat()
      const activities = [];
      expect(gen.next({ activities }).value).toEqual(
        call([ChatSagas, ChatSagas.bootstrapChat], {
          conversationId,
          documentId: conversationId,
          endpointId,
          mode: 'transcript',
          user: { id: userGUID, name: 'User', role: 'user' },
        } as any)
      );

      // put openDocument
      expect(gen.next().value).toEqual(
        put(
          openDocument({
            contentType: SharedConstants.ContentTypes.CONTENT_TYPE_TRANSCRIPT,
            documentId: conversationId,
            fileName: filename,
            isGlobal: false,
          })
        )
      );

      // call feedActivitiesAsTranscript()
      expect(gen.next().value).toEqual(
        call(
          [ConversationService, ConversationService.feedActivitiesAsTranscript],
          serverUrl,
          conversationId,
          activities
        )
      );

      try {
        gen.next({ ok: false, status: 500, statusText: 'INTERNAL SERVER ERROR' });
        expect(true).toBe(false); // ensure catch is hit
      } catch (e) {
        expect(e).toEqual(
          new Error('Error occurred while feeding activities as a transcript: 500: INTERNAL SERVER ERROR')
        );
      }
    });
  });

  it('should bootstrap a chat', () => {
    const payload: any = {
      conversationId: 'someConvoId',
      documentId: 'someDocId',
      endpointId: 'someEndpointId',
      mode: 'livechat',
      msaAppId: 'someAppId',
      msaPassword: 'someAppPw',
      user: { id: 'user1' },
    };
    const gen = ChatSagas.bootstrapChat(payload);

    // put webChatStoreUpdated
    expect(gen.next().value).toEqual(put(webChatStoreUpdated(payload.documentId, mockWebChatStore)));

    // put webSpeechFactoryUpdated
    expect(gen.next().value).toEqual(put(webSpeechFactoryUpdated(payload.documentId, undefined)));

    // call createDirectLineObject()
    expect(gen.next().value).toEqual(
      call(
        [ChatSagas, (ChatSagas as any).createDirectLineObject],
        payload.conversationId,
        payload.mode,
        payload.endpointId,
        payload.user.id
      )
    );

    // put newChat
    const directLine: any = {};
    expect(gen.next(directLine).value).toEqual(
      put(
        newChat(payload.documentId, payload.mode, {
          conversationId: payload.conversationId,
          directLine,
          userId: payload.user.id,
        })
      )
    );

    // put updatePendingSpeechTokenRetrieval
    expect(gen.next().value).toEqual(put(updatePendingSpeechTokenRetrieval(payload.documentId, true)));

    // select web speech factory
    expect(gen.next().value).toEqual(select(getWebSpeechFactoryForDocumentId, payload.documentId));

    // call createCognitiveServicesSpeechServicesPonyfillFactory
    expect(gen.next({}).value).toEqual(
      call(createCognitiveServicesSpeechServicesPonyfillFactory, {
        authorizationToken: jasmine.anything(), // any(Promise) doesn't match correctly
        region: 'westus',
      })
    );

    // put webSpeechFactoryUpdated
    const factory: any = {};
    expect(gen.next(factory).value).toEqual(put(webSpeechFactoryUpdated(payload.documentId, factory)));

    // put updatePendingSpeechTokenRetrieval
    expect(gen.next().value).toEqual(put(updatePendingSpeechTokenRetrieval(payload.documentId, false)));

    expect(gen.next().done).toBe(true);
  });

  describe('restartConversation', () => {
    it('should restart a conversation with a new user and conversation ID', () => {
      const serverUrl = 'http://localhost:56273';
      const payload = {
        documentId: 'someDocId',
        requireNewConversationId: true,
        requireNewUserId: true,
      };
      const mockAction: any = {
        payload,
      };
      const gen = ChatSagas.restartConversation(mockAction);

      // select chat from document id
      const chat = {
        conversationId: 'someConvoId',
        directLine: {
          end: jest.fn(),
        },
        mode: 'livechat' as any,
      };
      expect(gen.next().value).toEqual(select(getChatFromDocumentId, payload.documentId));

      // select server url
      expect(gen.next(chat).value).toEqual(select(getServerUrl));

      // put clearLog
      expect(gen.next(serverUrl).value).toEqual(put(clearLog(payload.documentId)));
      expect(chat.directLine.end).toHaveBeenCalled();

      // put setInspectorObjects
      expect(gen.next().value).toEqual(put(setInspectorObjects(payload.documentId, [])));

      // put webChatStoreUpdated
      expect(gen.next().value).toEqual(put(webChatStoreUpdated(payload.documentId, mockWebChatStore)));

      // put webSpeechFactoryUpdated
      expect(gen.next().value).toEqual(put(webSpeechFactoryUpdated(payload.documentId, undefined)));

      // call updateConversation
      const conversationId = 'someUniqueId|livechat';
      const userId = 'someUniqueIdv4';
      expect(gen.next().value).toEqual(
        call([ConversationService, ConversationService.updateConversation], serverUrl, chat.conversationId, {
          conversationId,
          userId,
        })
      );

      // res.jon()
      const response = {
        botEndpoint: {},
        json: jest.fn(),
        members: [],
        ok: true,
      };
      gen.next(response);

      // call createDirectLineObject
      const json = {
        botEndpoint: {
          botUrl: 'http://localhost:3978',
          id: 'botEndpointId',
          msaAppId: 'someAppId',
          msaPassword: 'someAppPw',
        },
        members: [],
      };
      expect(gen.next(json).value).toEqual(
        call(
          [ChatSagas, (ChatSagas as any).createDirectLineObject],
          conversationId,
          chat.mode,
          json.botEndpoint.id,
          userId
        )
      );

      // put newChat
      const directLine: any = {};
      expect(gen.next(directLine).value).toEqual(
        put(
          newChat(payload.documentId, chat.mode, {
            conversationId,
            directLine,
            userId,
          })
        )
      );

      // call sendInitialLogReport
      expect(gen.next().value).toEqual(
        call(
          [ConversationService, ConversationService.sendInitialLogReport],
          serverUrl,
          conversationId,
          json.botEndpoint.botUrl
        )
      );

      // call sendInitialActivity
      expect(gen.next().value).toEqual(
        call([ChatSagas, ChatSagas.sendInitialActivity], { conversationId, members: json.members, mode: chat.mode })
      );

      // put updatePendingSpeechTokenRetrieval
      expect(gen.next().value).toEqual(put(updatePendingSpeechTokenRetrieval(payload.documentId, true)));

      // select web speech factory
      expect(gen.next().value).toEqual(select(getWebSpeechFactoryForDocumentId, payload.documentId));

      // call createCognitiveServicesSpeechServicesPonyfillFactory
      const existingFactory = {};
      expect(gen.next(existingFactory).value).toEqual(
        call(createCognitiveServicesSpeechServicesPonyfillFactory, {
          authorizationToken: jasmine.anything(), // .any(Promise) doesn't match correctly
          region: 'westus',
        })
      );

      // put webSpeechFactoryUpdated
      const newFactory: any = {};
      expect(gen.next(newFactory).value).toEqual(put(webSpeechFactoryUpdated(payload.documentId, newFactory)));

      // put updatePendingSpeechTokenRetrieval
      expect(gen.next().value).toEqual(put(updatePendingSpeechTokenRetrieval(payload.documentId, false)));

      expect(gen.next().done).toBe(true);
    });

    it('should restart a conversation with the same user and conversation ID', () => {
      const serverUrl = 'http://localhost:56273';
      const payload = {
        documentId: 'someDocId',
        requireNewConversationId: false,
        requireNewUserId: false,
      };
      const mockAction: any = {
        payload,
      };
      const gen = ChatSagas.restartConversation(mockAction);

      // select chat from document id
      const chat = {
        conversationId: 'someConvoId',
        directLine: {
          end: jest.fn(),
        },
        mode: 'livechat' as any,
        userId: 'someUserId',
      };
      expect(gen.next().value).toEqual(select(getChatFromDocumentId, payload.documentId));

      // select server url
      expect(gen.next(chat).value).toEqual(select(getServerUrl));

      // put clearLog
      expect(gen.next(serverUrl).value).toEqual(put(clearLog(payload.documentId)));
      expect(chat.directLine.end).toHaveBeenCalled();

      // put setInspectorObjects
      expect(gen.next().value).toEqual(put(setInspectorObjects(payload.documentId, [])));

      // put webChatStoreUpdated
      expect(gen.next().value).toEqual(put(webChatStoreUpdated(payload.documentId, mockWebChatStore)));

      // put webSpeechFactoryUpdated
      expect(gen.next().value).toEqual(put(webSpeechFactoryUpdated(payload.documentId, undefined)));

      // call updateConversation
      const conversationId = chat.conversationId;
      const userId = chat.userId;
      expect(gen.next().value).toEqual(
        call([ConversationService, ConversationService.updateConversation], serverUrl, chat.conversationId, {
          conversationId,
          userId,
        })
      );

      // res.jon()
      const response = {
        botEndpoint: {},
        json: jest.fn(),
        members: [],
        ok: true,
      };
      gen.next(response);

      // call createDirectLineObject
      const json = {
        botEndpoint: {
          botUrl: 'http://localhost:3978',
          id: 'botEndpointId',
          msaAppId: 'someAppId',
          msaPassword: 'someAppPw',
        },
        members: [],
      };
      expect(gen.next(json).value).toEqual(
        call(
          [ChatSagas, (ChatSagas as any).createDirectLineObject],
          conversationId,
          chat.mode,
          json.botEndpoint.id,
          userId
        )
      );

      // put newChat
      const directLine: any = {};
      expect(gen.next(directLine).value).toEqual(
        put(
          newChat(payload.documentId, chat.mode, {
            conversationId,
            directLine,
            userId,
          })
        )
      );

      // call sendInitialLogReport
      expect(gen.next().value).toEqual(
        call(
          [ConversationService, ConversationService.sendInitialLogReport],
          serverUrl,
          conversationId,
          json.botEndpoint.botUrl
        )
      );

      // call sendInitialActivity
      expect(gen.next().value).toEqual(
        call([ChatSagas, ChatSagas.sendInitialActivity], { conversationId, members: json.members, mode: chat.mode })
      );

      // put updatePendingSpeechTokenRetrieval
      expect(gen.next().value).toEqual(put(updatePendingSpeechTokenRetrieval(payload.documentId, true)));

      // select web speech factory
      expect(gen.next().value).toEqual(select(getWebSpeechFactoryForDocumentId, payload.documentId));

      // call createCognitiveServicesSpeechServicesPonyfillFactory
      const existingFactory = {};
      expect(gen.next(existingFactory).value).toEqual(
        call(createCognitiveServicesSpeechServicesPonyfillFactory, {
          authorizationToken: jasmine.anything(), // .any(Promise) doesn't match correctly
          region: 'westus',
        })
      );

      // put webSpeechFactoryUpdated
      const newFactory: any = {};
      expect(gen.next(newFactory).value).toEqual(put(webSpeechFactoryUpdated(payload.documentId, newFactory)));

      // put updatePendingSpeechTokenRetrieval
      expect(gen.next().value).toEqual(put(updatePendingSpeechTokenRetrieval(payload.documentId, false)));

      expect(gen.next().done).toBe(true);
    });

    it('should throw if updating the conversation fails while restarting the conversation', () => {
      const serverUrl = 'http://localhost:56273';
      const payload = {
        documentId: 'someDocId',
        requireNewConversationId: true,
        requireNewUserId: true,
      };
      const mockAction: any = {
        payload,
      };
      const gen = ChatSagas.restartConversation(mockAction);

      // select chat from document id
      const chat = {
        conversationId: 'someConvoId',
        directLine: {
          end: jest.fn(),
        },
        mode: 'livechat' as any,
      };
      expect(gen.next().value).toEqual(select(getChatFromDocumentId, payload.documentId));

      // select server url
      expect(gen.next(chat).value).toEqual(select(getServerUrl));

      // put clearLog
      expect(gen.next(serverUrl).value).toEqual(put(clearLog(payload.documentId)));
      expect(chat.directLine.end).toHaveBeenCalled();

      // put setInspectorObjects
      expect(gen.next().value).toEqual(put(setInspectorObjects(payload.documentId, [])));

      // put webChatStoreUpdated
      expect(gen.next().value).toEqual(put(webChatStoreUpdated(payload.documentId, mockWebChatStore)));

      // put webSpeechFactoryUpdated
      expect(gen.next().value).toEqual(put(webSpeechFactoryUpdated(payload.documentId, undefined)));

      // call updateConversation
      const conversationId = 'someUniqueId|livechat';
      const userId = 'someUniqueIdv4';
      expect(gen.next().value).toEqual(
        call([ConversationService, ConversationService.updateConversation], serverUrl, chat.conversationId, {
          conversationId,
          userId,
        })
      );

      try {
        gen.next({ ok: false, status: 500, statusText: 'INTERNAL SERVER ERROR' });
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toEqual(new Error('Error occurred while updating a conversation: 500: INTERNAL SERVER ERROR'));
      }
    });
  });

  it('should send a conversation update for non-debug mode conversations', () => {
    const payload = {
      conversationId: 'someConvoId',
      members: [],
      mode: 'livechat',
    };
    const gen = ChatSagas.sendInitialActivity(payload);

    // select server url
    expect(gen.next().value).toEqual(select(getServerUrl));

    // call sendActivityToBot
    const serverUrl = 'http://localhost:58267';
    const activity = {
      type: 'conversationUpdate',
      membersAdded: payload.members,
      membersRemoved: [],
    };
    expect(gen.next(serverUrl).value).toEqual(
      call([ConversationService, ConversationService.sendActivityToBot], serverUrl, payload.conversationId, activity)
    );
  });

  it('should send the /INSPECT open command for debug mode conversations', () => {
    const payload = {
      conversationId: 'someConvoId',
      members: [],
      mode: 'debug',
    };
    const gen = ChatSagas.sendInitialActivity(payload);

    // select server url
    expect(gen.next().value).toEqual(select(getServerUrl));

    // call sendActivityToBot
    const serverUrl = 'http://localhost:58267';
    const activity = {
      type: 'message',
      text: '/INSPECT open',
    };
    expect(gen.next(serverUrl).value).toEqual(
      call([ConversationService, ConversationService.sendActivityToBot], serverUrl, payload.conversationId, activity)
    );
  });
});
