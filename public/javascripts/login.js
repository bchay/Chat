$(document).ready(function() {	
	$("#login").validate({
		messages: {
			pass: "Your password must be at least eight characters."
		}
	});
	
	$.validator.addMethod("pattern", function(value, element, param) {
		if (this.optional(element)) {
			return true;
		}
		if (typeof param === "string") {
			param = new RegExp("^(?:" + param + ")$");
		}
		return param.test(value);
	}, "Invalid format.");
});
