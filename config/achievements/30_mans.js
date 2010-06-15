var handle;

var achieved = Array();

exports.init = function (providedHandle) {
	inspect('30 mans added');
	handle = providedHandle;
	handle.addListener('front', check);
};

function check (payload) {
	
	var element = handle.getData(payload.user, 'element');
	
	if (!handle.isAchieved(payload.user)){

		if (typeof element === 'undefined') {

			element = {};
			element[payload.element] = 1;
			handle.setData(payload.user, 'element', element);
			
		}
		
		if(element["30_MANS"] === 1){

			handle.setData(payload.user, 'element', element);
			handle.achieve(payload.user);
			
		}						
		
	}

}
