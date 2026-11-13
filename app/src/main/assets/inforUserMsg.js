var inforUserMsgVersion = '11.0.1.0006';

var updmsgproc = 'nspdrfupdmsg';
var sendmsgproc = 'nspdrfsendmsg';
var newmsgproc = 'nspdrfallmsg';
var activeuserproc = 'nspdrfgetactiveusers';

function InforUserMsg( msgid, convid, sender, msg, adt, rdt, grp, dgrp ) {
	this.msgID = msgid ? msgid : generateID( );
	this.convID = convid ? convid : "-1";
	this.sender = sender;
	this.senderName = sender;
	this.msg = msg;
	this.adddate = null;
	this.readdate = null;
	this.group = '';
	this.displayGroup = '';

	//
	// if we are passed just the grp value, it's from the server and
	// contains a delimited list of user ID and user Names
	//
	// if we get a dgrp, this is local and grp will only contain user ids
	// and dgrp contains the names
	//
	if ( typeof dgrp !== 'undefined' ) {
		this.group = grp;
		this.displayGroup = dgrp;
	} else {
		var tempGrp = grp.split( fieldDelimiter );
		for ( var idx = 0, l = tempGrp.length - 1; idx < l; idx += 2 ) {
			if ( tempGrp[ idx ] === sender ) {
				this.senderName = tempGrp[ idx + 1 ];
			}

			this.group += tempGrp[ idx ] + fieldDelimiter;

			if ( tempGrp[ idx ] !== userID ) {
				if ( idx === 0 )
					this.displayGroup += tempGrp[ idx + 1 ];
				else
					this.displayGroup += ' - ' + tempGrp[ idx + 1 ];
			}
		}
	}

	if ( adt ) {
		if ( typeof adt === 'string' || typeof adt === 'number' ) {
			this.adddate = new InforDate( adt );
		} else if ( typeof adt.formatDateForMsgDisplay == 'function' ) {
			this.adddate = adt;
		} else if ( typeof adt.getDate == 'function' ) {
			// Date object;
			this.adddate = new InforDate( adt );
		}
	} else {
		this.adddate = new InforDate( 1901, 1, 1 );
	}

	if ( rdt ) {
		if ( typeof rdt === 'string' || typeof rdt === 'number' ) {
			this.readdate = new InforDate( rdt );
		} else if ( typeof rdt.formatDateForMsgDisplay == 'function' ) {
			this.readdate = rdt;
		} else if ( typeof rdt.getDate == 'function' ) {
			// Date object;
			this.readdate = new InforDate( rdt );
		}
	}
};

/*
 * Determines if the currently logged in user has read this message If this user was the sender we don't care about it being unread by other users.
 */
InforUserMsg.prototype.isRead = function( theUser ) {
	return this.sender === theUser || this.readdate ? true : false;
};

InforUserMsg.isConversationRead = function( convID, theUser ) {
	var conv = InforUserMsg.messages[ convID ];
	if ( typeof conv == 'undefined' ) {
		return false;
	}

	var idx = 0, msg = null, l = conv.length;
	for ( ; idx < l; ++idx ) {
		msg = conv[ idx ];
		if ( !msg.isRead( theUser ) ) {
			return false;
		}
	}

	return true;
};

InforUserMsg.prototype.confirmRead = function( ) {
	var data = 'EXEC ' + updmsgproc + ' ' + buildXMITHeader( updmsgproc, updmsgproc ) + addEncodedDataParameters( userID, 'read', this.msgID );
	this.readdate = new Date( );
	ws.sendMessage( updmsgproc, data, checkNewMessages, null, true );
};

InforUserMsg.prototype.createConversationOverview = function( theUser ) {
	var date = new Date( );
	if ( this.adddate )
		date = this.adddate.formatDateForMsgDisplay( );

	var cls = '';
	if ( !InforUserMsg.isConversationRead( this.convID, theUser ) )
		cls = 'new';

	if ( !this.displayGroup || this.displayGroup.length == 0 ) {
		var c = InforUserMsg.getConversation( this.convID );
		if ( c ) {
			for ( var idx = 0; idx < c.length; ++idx ) {
				if ( c[ idx ].displayGroup && c[ idx ].displayGroup.length > 0 ) {
					this.displayGroup = c[ idx ].displayGroup;
					break;
				}
			}
		} else {
			this.displayGroup = this.group;
		}
	}

	return '<div class="SCE-Meta-ConversationContainer ' + cls + '">' + '<div class="SCE-Meta-ConversationText senderheader">' + this.displayGroup + '</div>' + '<div class="inforTextArea SCE-Meta-ConversationText conversation">' + this.msg + '</div>' + '<div class="SCE-Meta-ConversationText convid">' + this.convID + '</div>' + '<div class="SCE-Meta-ConversationText sentdate">' + ( date ? date : '' ) + '</div>' + '</div>';
};

InforUserMsg.createMessageEntry = function( convID ) {
	if ( !InforUserMsg.messages[ convID ] )
		return '';

	var msgs = InforUserMsg.getConversation( convID );

	var idx, size, daMsg, cls;
	var html = '';
	for ( idx = 0, size = msgs.length; idx < size; ++idx ) {
		daMsg = msgs[ idx ];
		if ( daMsg.sender != userID ) {
			cls = 'sender';
			if ( daMsg.readdate == null ) {
				daMsg.confirmRead( );
			}
		} else {
			cls = 'receiver';
		}

		html += '<div class="SCE-Meta-MsgText ' + cls + '" >' + '<div class="name">' + daMsg.senderName + '</div>' + '<div class="text">' + daMsg.msg + '</div>' + '<div class="time">' + daMsg.adddate.formatDateForMsgDisplay( ) + '</div>' + '</div>';
	}
	return html;
};

/*
 * target is the name of the other person in the conversation.
 */
InforUserMsg.addMessageToConversation = function( convID, msg, receiverName, receiver, isNew ) {
	var isStartOfConversation = false;

	if ( convID == "-1" ) {
		convID = generateID( );
		isStartOfConversation = true;
	}

	if ( typeof InforUserMsg.messages[ convID ] === 'undefined' )
		InforUserMsg.messages[ convID ] = [ ];

	if ( typeof msg === 'string' ) {
		if ( isStartOfConversation ) {
			msg = new InforUserMsg( null, convID, userID, msg, new Date( ), new Date( ), receiver, receiverName );
		} else {
			var c = InforUserMsg.getConversation( convID );
			msg = new InforUserMsg( null, convID, userID, msg, new Date( ), new Date( ), c[ 0 ].group, c[ 0 ].displayGroup );
		}
	}

	if ( !isNew ) {
		var idx = 0, size = InforUserMsg.messages[ convID ].length, ta = InforUserMsg.messages[ convID ], t = null, exists = false;
		for ( ; idx < size; ++idx ) {
			t = ta[ idx ];
			if ( msg.msgID == t.msgID ) {
				exists = true;
				break;
			}
		}
		if ( !exists ) {
			InforUserMsg.messages[ convID ].push( msg );
		}
	} else {
		InforUserMsg.messages[ convID ].push( msg );
	}

	if ( isNew ) {
		convDlg.find( '#daMsg' ).attr( 'readonly', 'readonly' );
		currentScreen.beginStatusBarProcessing( SCElocalize( "Working" ) );

		var sendString = 'EXEC ' + sendmsgproc + ' ' + buildXMITHeader( sendmsgproc, sendmsgproc ) + addEncodedDataParameters( isStartOfConversation, userID, convID, msg.msg );
		if ( !receiver )
			sendString += addEncodedDataParameters( msg.group );
		else
			sendString += addEncodedDataParameters( receiver + fieldDelimiter + userID );
		ws.sendMessage( sendmsgproc, sendString, InforUserMsg.msgSent, msg, false );
	}

	return convID;
};

InforUserMsg.msgSent = function( data, cbData ) {
	var fields = data.split( ',' );

	var eCode = parseInt( fields[ 5 ] );
	if ( eCode === 9 ) {
		var msg = fields[ 7 ];
		displayPageError( msg );
	} else {
		var oldConvID = cbData.convID;

		cbData.msgID = fields[ 9 ];
		cbData.convID = fields[ 10 ];

		if ( oldConvID != cbData.convID ) {
			if ( typeof InforUserMsg.messages[ cbData.convID ] === 'undefined' )
				InforUserMsg.messages[ cbData.convID ] = [ ];

			if ( typeof InforUserMsg.messages[ oldConvID ] !== 'undefined' ) {
				delete InforUserMsg.messages[ oldConvID ];
			}

			InforUserMsg.messages[ cbData.convID ].push( cbData );
		}

		if ( dialogOpen && dialogOpen.is( convDlg ) ) {
			var msgConvID = convDlg.find( '#hiddenConvID' ).val( );
			if ( msgConvID == oldConvID )
				convDlg.find( '#hiddenConvID' ).val( cbData.convID );
		}

		checkNewMessages( );
		convDlg.find( '#daMsg' ).removeAttr( 'readonly' ).focus( );
		try {
			$( 'body' ).inforBusyIndicator( 'close' );
		} catch ( err ) {
		}

	}
};

InforUserMsg.getConversation = function( convID ) {
	return InforUserMsg.messages[ convID ];
};

InforUserMsg.getGroupFromConvID = function( convID ) {
	if ( !convID || convID == "-1" )
		throw 'Conversation ID does not exist:[' + convID + ']';

	var conv = InforUserMsg.messages[ convID ];

	if ( !conv || conv.length == 0 || !conv[ 0 ].group || conv[ 0 ].group.length == 0 )
		throw 'Conversation ID does not exist:[' + convID + ']';

	return conv[ 0 ].group;
};

InforUserMsg.newestMessageTime = function( convID ) {
	var conv = InforUserMsg.getConversation( convID );
	if ( typeof conv === 'undefined' )
		return 0;

	var idx = 0, l = conv.length, newestTime = 0, tTime = null;
	for ( ; idx < l; ++idx ) {
		tTime = conv[ idx ].adddate.getTime( );
		if ( tTime > newestTime )
			newestTime = tTime;
	}

	return newestTime;
};

// queue of messages received but not yet processed for viewing.
InforUserMsg.incomingMsg = new Queue( );
// messages is a hash of messages by conversation group
InforUserMsg.messages = {};
