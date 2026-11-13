var queueVersion = '11.0.1.0006';

function Queue( ) {
	this.queue = [ ];
	this.idx = 0;
}

Queue.prototype = {

	length : function( ) {
		return ( this.queue.length - this.idx );
	},

	empty : function( ) {
		this.queue = [ ];
		this.idx = 0;
	},

	enqueue : function( item ) {
		this.queue.push( item );
	},

	dequeue : function( ) {
		if ( this.queue.length == 0 )
			return undefined;

		var item = this.queue[ this.idx ];

		if ( ++this.idx * 2 >= this.queue.length ) {
			this.queue = this.queue.slice( this.idx );
			this.idx = 0;
		}

		return item;
	},

	peek : function( ) {
		return ( this.queue.length > 0 ? this.queue[ this.idx ] : undefined );
	}

};
