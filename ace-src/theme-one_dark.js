/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {

exports.isDark = true;
exports.cssClass = "ace-one-dark";
exports.cssText = ".ace-one-dark .ace_gutter { background: #282c34; color: rgb(74,78,87) } .ace-one-dark .ace_print-margin { width: 1px; background: #e8e8e8 } .ace-one-dark { background-color: #282c34; color: #6c7079 } .ace-one-dark .ace_cursor { color: #528bff } .ace-one-dark .ace_marker-layer .ace_selection { background: rgba(187, 204, 245, 0.11) } .ace-one-dark.ace_multiselect .ace_selection.ace_start { box-shadow: 0 0 3px 0px #282c34; border-radius: 2px } .ace-one-dark .ace_marker-layer .ace_step { background: rgb(198, 219, 174) } .ace-one-dark .ace_marker-layer .ace_bracket { margin: -1px 0 0 -1px; border: 1px solid #747369 } .ace-one-dark .ace_marker-layer .ace_active-line { background: rgba(140, 194, 252, 0.043) } .ace-one-dark .ace_gutter-active-line { background-color: rgba(140, 194, 252, 0.043) } .ace-one-dark .ace_marker-layer .ace_selected-word { border: 1px solid rgba(187, 204, 245, 0.11) } .ace-one-dark .ace_fold { background-color: #5cb3fa; border-color: #6c7079 } .ace-one-dark .ace_keyword { color: #cd74e8 } .ace-one-dark .ace_keyword.ace_operator { color: #adb7c9 } .ace-one-dark .ace_keyword.ace_other.ace_unit { color: #db9d63 } .ace-one-dark .ace_constant { color: #db9d63 } .ace-one-dark .ace_constant.ace_numeric { color: #db9d63 } .ace-one-dark .ace_constant.ace_character.ace_escape { color: #5ebfcc } .ace-one-dark .ace_support.ace_function { color: #5ebfcc } .ace-one-dark .ace_support.ace_class { color: #f0c678 } .ace-one-dark .ace_storage { color: #cd74e8 } .ace-one-dark .ace_invalid.ace_illegal { color: #ffffff; background-color: #e05252 } .ace-one-dark .ace_invalid.ace_deprecated { color: #2c323d; background-color: #d27b53 } .ace-one-dark .ace_string { color: #9acc76 } .ace-one-dark .ace_string.ace_regexp { color: #5ebfcc } .ace-one-dark .ace_comment { font-style: italic; color: #5f697a } .ace-one-dark .ace_variable { color: #eb6772 } .ace-one-dark .ace_meta.ace_selector { color: #cd74e8 } .ace-one-dark .ace_entity.ace_other.ace_attribute-name { color: #db9d63 } .ace-one-dark .ace_entity.ace_name.ace_function { color: #5cb3fa } .ace-one-dark .ace_entity.ace_name.ace_tag { color: #eb6772 } .ace-one-dark .ace_markup.ace_list { color: #eb6772 }";


var dom = require("../lib/dom");
dom.importCssString(exports.cssText, exports.cssClass);
});
