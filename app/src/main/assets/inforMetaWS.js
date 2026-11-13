var inforMetaWSVersion = '11.0.1.0006';

function InforMetaWS( connections ) {
	this.sending = false;
	this.messages = {};
	this.length = 0;
	this.connections = connections;
	this.cIndex = -1;
	this.attempts = 0;
	this.reconnect = false;
	this.canSend = false;
	this.init( false );
};

InforMetaWS.prototype.nextConnection = function( ) {
	++this.cIndex;
	if ( this.cIndex >= this.connections.length )
		this.cIndex = 0;
	return this.connections[ this.cIndex ];
};

InforMetaWS.prototype.currentConnection = function( ) {
	return this.connections[ this.cIndex ];
};

InforMetaWS.prototype.init = function( reconnect ) {
	try {
		if ( isDebugOn( "SOCKET" ) )
			console.debug( simpleDebug( 'SOCKET', 'init called', reconnect ) );

		this.canSend = false;
		this.reconnect = reconnect;
		if ( reconnect && this.attempts >= 150 ) {
			displayPageError( SCElocalize( "Error_NoServer" ), function( ) {
				exitScreen( );
			} );
			return false;
		}

		var theText = $( '#inforLoadingOverlay > span' ).html( );
		if ( theText ) {
			if ( isDebugOn( "SOCKET" ) )
				console.debug( simpleDebug( 'SOCKET', 'init called', theText ) );
			var idx = theText.indexOf( '...' );
			if ( idx >= 0 ) {
				theText = theText.substring( 0, idx + 3 ) + '' + this.attempts;
				$( '#inforLoadingOverlay > span' ).html( theText );
			}
		}

		this.reconnect = reconnect;
		this.cUrl = this.nextConnection( );
		if ( isDebugOn( "SOCKET" ) )
			console.debug( simpleDebug( 'SOCKET', 'attempting to connect to', this.cUrl ) );
		this.socket = new WebSocket( this.cUrl );
		this.socket.onopen = this.onopen;
		this.socket.onmessage = this.onmessage;
		this.socket.onclose = this.onclose;
		this.socket.onerror = this.onerror;
		this.socket.parent = this;
		return true;
	} catch ( e ) {
		displayPageError( e.message ? e.message : e, function( ) {
			exitScreen( );
		} );
		return false;
	}
};

InforMetaWS.prototype.onopen = function( open ) {
	if ( isDebugOn( "SOCKET" ) )
		console.debug( simpleDebug( 'SOCKET', 'OPENED', '' ) );
	ws.attempts = 0;

	if ( ws.reconnect ) {
		reconnect( );
	} else {
		loginDIV.show( );
		loginDIV.find( '#user' ).focus( );
	}
};

InforMetaWS.prototype.onclose = function( close ) {
	if ( isDebugOn( "SOCKET" ) )
		console.debug( simpleDebug( 'SOCKET', 'CLOSED', '' ) );

	// clear out any ping requests.
	for ( var key in ws.messages ) {
		var msg = ws.messages[ key ];
		if ( msg.proc == 'PING' ) {
			console.debug( simpleDebug( 'SOCKET', 'msgs in queue', msg.id ) );
			clearInterval( msg.timer );
			delete ws.messages[ msg.id ];
		}
	}

	setTimeout( function( ) {
		++ws.attempts;
		ws.init( true );
	}, 3000 );
};

InforMetaWS.prototype.onerror = function( error ) {
	console.error( simpleDebug( 'SOCKET', 'ERROR', '' ) );
};

InforMetaWS.prototype.handleSystemMessage = function( data ) {
	var newData = null;

	try {
		if ( isDebugOn( "SOCKET" ) )
			console.debug( simpleDebug( 'SOCKET', 'handleSystemMessage', data ) );
		var tdata = JSON.parse( data );
		if ( tdata ) {
			if ( tdata.sourceId ) {
				sourceId = tdata.sourceId;
			}

			if ( tdata.type ) {
				this.canSend = true;
			}
		}
	} catch ( err ) {
		console.error( 'failed to parse JSON response string from websocket server', data, err.message, err.stack );
	}

	return newData;

};

InforMetaWS.prototype.handleNewMessage = function( data ) {
	// this user was sent a message, queue it up to be read.
	var idx, size, entry, group, info, msg, msgText;
	var msgs = data.split( parmDelimiter );
	msgs = decode( msgs[ 9 ] );
	msgs = msgs.split( dataDelimiter );

	for ( idx = 0, size = msgs.length; idx < size; ++idx ) {
		entry = msgs[ idx ].split( recDelimiter );
		if ( entry.length != 2 ) {
			continue;
		}
		group = entry[ 0 ];
		info = entry[ 1 ].split( fieldDelimiter );
		if ( info.length > 1 ) {
			msgText = decode( info[ 3 ] );
			var adt = parseInt( info[ 4 ] );
			if ( isNaN( adt ) ) {
				adt = null;
			}
			var rdt = parseInt( info[ 5 ] );
			if ( isNaN( rdt ) ) {
				rdt = null;
			}
			if ( isDebugOn( "SOCKET" ) )
				console.debug( simpleDebug( 'SOCKET', 'MSG', msgText + ':' + info[ 4 ] + ':' + info[ 5 ] + ':' + adt + ':' + rdt + ':' + group ) );
			msg = new InforUserMsg( info[ 0 ], info[ 1 ], info[ 2 ], msgText, adt, rdt, group );
			InforUserMsg.incomingMsg.enqueue( msg );
		}
	}
	if ( InforUserMsg.incomingMsg.length( ) > 0 ) {
		youveGotMail( );
	}
};

InforMetaWS.prototype.onmessage = function( evt ) {

	var data = evt.data;

	try {
		data = decode( data );
	} catch ( e ) {
	}
	if ( isDebugOn( "SENDMSG" ) ) {
		if ( currentScreen )
			console.debug( screenDebug( 'SENDMSG', currentScreen, 'DECODED INCOMING MESSAGE', data ) );
		else
			console.debug( sDebug( 'SENDMSG', '', '', '', 'DECODED INCOMING MESSAGE', data ) );
	}

	if ( data.substring( 0, 1 ) == '{' ) {
		// when the initial connection is made, the server will send
		// back a JSON info message on who/what the server is.
		var newData = this.parent.handleSystemMessage( data );
		if ( newData == null ) {
			return;
		} else {
			data = newData;
		}
	} else if ( data.substring( 0, 8 ) == 'maxframe' ) {
		// ignore this server message
		return;
	} else if ( data == "TIMEOUT" ) {
		window.location.href = window.location.href;
		return;
	}

	//
	// message formats coming from JWebSockets are always prefixed with a packetID.
	//
	// <PACKETID>,FRAGMENT<FRAGMENTID>,<SCEDATA>.......
	// the FRAGMENT parameter is optional, and is only there for large messages
	// if we get a FRAGMENT id, we need to collect the data and wait until we
	// get an LFRAGMENT to signify that no more fragments are coming.
	//
	var indexOF = data.indexOf( ',' );
	var packetID = data.substring( 0, indexOF );

	//
	// transmission! acknowledge we got the packet.
	// without this, JWebSocket will not send more packets
	// and will assume that it failed to send the packet.
	//
	this.send( 'pda' + packetID );

	var fragID = null;
	var lastFRAG = false;
	data = data.substring( indexOF + 1 );
	if ( data.startsWith( 'FRAGMENT' ) ) {
		indexOF = data.indexOf( ',' );
		fragID = data.substring( 8, indexOF );
		data = data.substring( indexOF + 1 );
	} else if ( data.startsWith( 'LFRAGMENT' ) ) {
		indexOF = data.indexOf( ',' );
		fragID = data.substring( 9, indexOF );
		data = data.substring( indexOF + 1 );
		lastFRAG = true;
	}

	var msgID = this.parent.parseMSGID( data, fragID != null );

	if ( msgID == null ) {
		if ( isDebugOn( "SENDMSG" ) )
			console.debug( simpleDebug( 'SENDMSG', 'RECEIVED INCOMING MESSAGE WITH NO MSGID', evt.data ) );

		if ( controller.procWindowIsUp ) {
			// we're waiting on something and it came back malformed!
			currentScreen.endStatusBarProcessing( );
			displayPageError( "UNKNOWN", function( ) {
				navigateHomeMenu( );
				currentScreen.enableScreen( );
			} );
			return;
		} else {
			// not waiting and we got something odd for no known reason. ignore it.
			return;
		}
	}

	var theMSG = this.parent.messages[ msgID ];

	if ( theMSG ) {
		if ( data.endsWith( 'PONG' ) ) {
			theMSG.waitCounter = 1;
			clearInterval( theMSG.timer );
			if ( !theMSG.handler ) {
				if ( isDebugOn( 'SENDMSG' ) )
					console.error( simpleDebug( 'SENDMSG', 'received PONG BUT no handler?', data ) );
			} else {
				theMSG.handler( data, theMSG.data );
			}
			return;
		}
		try {
			if ( fragID ) {
				//
				// collect the fragment data, and store in the message object until
				// we get all the data to build the full message.
				//
				if ( !theMSG.frags )
					theMSG.frags = [ ];
				theMSG.frags[ theMSG.frags.length ] = data;
				if ( !lastFRAG ) {
					// this wasn't the last fragment. don't process until we
					// get all the fragments.
					return;
				}

				// we have all the fragments, piece them all together and process.
				data = theMSG.frags.join( '' );
			}

			// this was a fire and forget message, there is nothing we need to process
			// on the return.
			if ( theMSG.fnf == true ) {
				return;
			}

			if ( theMSG.proc == newmsgproc ) {
				this.parent.handleNewMessage( data );
			} else if ( theMSG.handler ) {
				theMSG.handler( data, theMSG.data );
			} else {
				// here down is just regular processing of a PROC call return values.
				if ( controller )
					controller.setResume( true );

				if ( currentScreen && currentScreen.fieldData )
					currentScreen.handleXMITReturn( data );
			}
		} finally {
			if ( !fragID || lastFRAG ) {
				delete this.parent.messages[ msgID ];
				this.parent.length -= 1;
				this.parent.sending = false;
			}
		}
	} else {
		// unexpected message, most like notification of new messages sent to this user.
		this.parent.handleNewMessage( data );
	}
};

InforMetaWS.prototype.sendMessage = function( procname, data, callback, callbackData, fireAndForget ) {
	var theMsgID = generateID( );

	// save for failure case
	ws.afterReconnect = function( ) {
		this.sendFinal( theMsgID, procname, data, callback, callbackData, fireAndForget );
	};

	this.sendFinal( theMsgID, 'PING', 'PING', function( ) {
		ws.sendFinal( theMsgID, procname, data, callback, callbackData, fireAndForget );
		delete ws.afterReconnect;
	}, data, false );

	return theMsgID;
};

InforMetaWS.prototype.sendMessageNoPing = function( procname, data, callback, callbackData, fireAndForget ) {
	var theMsgID = generateID( );
	this.sendFinal( theMsgID, procname, data, callback, callbackData, fireAndForget );
	return theMsgID;
};

InforMetaWS.prototype.sendFinal = function( theMsgID, procname, data, callback, callbackData, fireAndForget ) {
	this.sending = true; // this will block KEYEVENTS
	var newMsg = null;
	try {
		if ( typeof procname != 'string' || procname.length == 0 ) {
			displayPageError( SCElocalize( 'Error_NoProcedureName' ), function( ) {
				exitScreen( );
			} );
			return null;
		}

		if ( this.socket && this.socket.readyState === 1 && this.canSend ) {
			// queue is empty, send this message right now.
			if ( currentScreen && !fireAndForget )
				currentScreen.disableScreen( true );

			data = theMsgID + ' ' + data;
			newMsg = {
				proc : procname,
				sent : false,
				handler : callback,
				data : callbackData,
				id : theMsgID,
				msg : data,
				retData : [ ],
				fnf : fireAndForget,
				waitCounter : 1,
				timer : null
			};

			if ( procname == 'PING' )
				this.setWaitThread( newMsg ); // sending the ping, wait for answer

			this.messages[ theMsgID ] = newMsg;
			this.length += 1;
			this.socket.send( data );

			// dont log the login data
			if ( procname != appConfig.loginProc && isDebugOn( "SENDMSG" ) )
				console.debug( sDebug( 'SENDMSG', '', '', '', 'SENDING OUTGOING MESSSAGE', 'PROC:[' + procname + '] DATA:[' + data + ']' ) );
		} else {
			// socket isn't in a state to send anything. queue the message up until the socket is ready.
			if ( currentScreen ) {
				if ( controller.procWindowIsUp )
					currentScreen.enableScreen( );

				currentScreen.disableScreen( SCElocalize( 'Error_SocketClosed' ) );
			}
			if ( this.reconnect ) {
				// we're trying to reconnect at the moment. As long as there already isn't
				// something waiting to be done after reconnect, we can queue this message.
				if ( !this.afterReconnect ) {
					// there is nothing waiting to be processed when the reconnect finishes. Add
					// this message to it.
					// save for failure case
					ws.afterReconnect = function( ) {
						this.sendFinal( theMsgID, procname, data, callback, callbackData, fireAndForget );
					};
				} else {
					// this is an error case. shouldn't be able to get here!
					console.debug( 'ERROR', 'got into sendFinal with a reconnect already queued' );
				}
			} else {
				setTimeout( function( ) {
					ws.sendFinal( theMsgID, procname, data, callback, callbackData, fireAndForget );
				}, 200 );
			}
		}
	} catch ( e ) {
		console.error( 'socket send error:', e );
	}
	return newMsg;
};

InforMetaWS.prototype.setWaitThread = function( newMsg ) {
	newMsg.timer = setInterval( function( msg ) {
		// need to be very careful of what code goes here.
		// triggering multiple events from here will cause some major problems.
		// We only want to trigger a socket close event here and nothing else.
		++msg.waitCounter;
		var theText = $( '#inforLoadingOverlay > span' ).html( );
		if ( theText ) {
			if ( isDebugOn( "SOCKET" ) )
				console.debug( simpleDebug( 'SOCKET', 'setWaitThread called', theText ) );
			var idx = theText.indexOf( '...' );
			if ( idx >= 0 ) {
				theText = theText.substring( 0, idx + 3 ) + '' + msg.waitCounter;
				$( '#inforLoadingOverlay > span' ).html( theText );
			}
		}

		if ( msg.proc == 'PING' && msg.waitCounter > 6 ) {
			clearInterval( msg.timer );
			if ( isDebugOn( "SENDMSG" ) )
				console.debug( simpleDebug( 'SENDMSG', msg.id, 'PING request unanswered. Reconnect.' ) );
			msg.waitCounter = 1;
			$( '#inforLoadingOverlay > span' ).html( SCElocalize( 'Error_SocketClosed' ) );

			// closing the socket when it's not there can take some time.
			if ( !ws.reconnect )
				ws.socket.close( 1000 ); // trigger a reconnect if we already haven't
		}
	}, 1000, newMsg );
};

InforMetaWS.prototype.createFakeResponse = function( msg, error ) {
	var aLength = msg.proc.length;
	var appFlag = msg.proc;

	if ( aLength >= 4 ) {
		appFlag = appFlag.substring( 0, aLength - 2 );
	}
	var cConn = ws.currentConnection( ).split( '/' ); // http://server:port/path so server value should be index 2
	return "999999 1" + parmDelimiter + userID + parmDelimiter + "999999" + parmDelimiter + usersWarehouse + parmDelimiter + appFlag + parmDelimiter + "09" + parmDelimiter + cConn[ 2 ] + parmDelimiter + error + parmDelimiter + "1" + parmDelimiter;
};

InforMetaWS.prototype.parseMSGID = function( rawData, isFrag ) {
	// strip off the leading msg ID if we have one.
	var msgID = rawData.substring( 0, 6 );
	if ( msgID.match( /\d\d\d\d\d\d/g ) ) {
		rawData = rawData.substring( 7 );
	} else {
		msgID = null;
		// there is no msgid on this piece of data because it's a fragment.
		// this part will trigger when it's not the first fragment, subsequent fragments
		// don't have the msgid. There should be only one item in 'messages' with a frags
		// property.
		if ( isFrag ) {
			for ( var key in this.messages ) {
				var msg = this.messages[ key ];
				if ( msg && msg.frags ) {
					msgID = msg.id;
					break;
				}
			}
		}
	}
	return msgID;
};
