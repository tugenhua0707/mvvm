/*
 * @param {el} 元素节点容器 如：el: '#mvvm-app'
 * @param {vm} Object 对象传递数据 
*/
function Compile(el, vm) {
  this.$vm = vm;
  // 判断是元素节点 还是 选择器
  this.$el = this.isElementNode(el) ? el : document.querySelector(el);
  if (this.$el) {
    /*
     因为遍历解析过程有多次操作dom节点，为了提高性能和效率，会先将根节点el转换成文档碎片fragment进行解析编译操作，
     解析完成后，再将fragment添加回原来真实的dom节点中。有关 DocumentFragment 请看 http://www.cnblogs.com/tugenhua0707/p/7465915.html
     */
    this.$fragment = this.node2Fragment(this.$el);
    this.init();
    this.$el.appendChild(this.$fragment);
  }
}

Compile.prototype = {
  node2Fragment: function(el) {
    var fragment = document.createDocumentFragment(),
      child;
    // 将原生节点拷贝到fragment中
    while (child = el.firstChild) {
      fragment.appendChild(child);
    }
    return fragment;
  },
  init: function() {
    // 进行解析编译操作
    this.compileElement(this.$fragment);
  },
  compileElement: function(el) {
    var self = this;
    var childNodes = el.childNodes;
    // 遍历所有的子节点 判断子节点是 元素节点还是文本节点 分别进行编译解析操作
    Array.prototype.slice.call(childNodes).forEach(function(node) {

      // 获取节点的文本内容和它的所有后代
      var text = node.textContent;

      // 正则匹配 {{xx}} 这样的xx文本值
      var reg = /\{\{(.*)\}\}/;
      // 判断是否是元素节点，然后进行编译
      if (self.isElementNode(node)) {
        self.compile(node);

      } else if(self.isTextNode(node) && reg.test(text)) {
        // 判断node是否是文本节点 且 符合正则匹配的 {{xx}} 那么就会进行编译解析
        self.compileText(node, RegExp.$1);
      }

      // 如果该节点还有子节点的话，那么递归进行判断编译
      if (node.childNodes && node.childNodes.length) {
        self.compileElement(node);
      }
    });
  },
  // 元素节点编译
  compile: function(node) {
    // 获取节点的所有属性
    var nodeAttrs = node.attributes;
    var self = this;
    /*
     遍历该节点的所有属性，判断该属性是事件指令还是普通指令
     */
    Array.prototype.slice.call(nodeAttrs).forEach(function(attr) {
      // 获取属性名
      var attrName = attr.name;
      // 先判断属性名是否是 以 v- 开头的
      if (self.isDirective(attrName)) {
        var attrValue = attr.value;
        // 获取 v-xx 中从xx开始的所有字符串
        var dir = attrName.substring(2);
        // 判断是否是事件指令
        if (self.isEventDirective(dir)) {
          compileUtil.eventHandler(node, self.$vm, attrValue, dir);
        } else {
          // 普通指令
          compileUtil[dir] && compileUtil[dir](node, self.$vm, attrValue);
        }
        // 循环完成一次后 删除该属性
        node.removeAttribute(attrName);
      }
    });
  },
  // 编译文本
  compileText: function(node, exp) {
    compileUtil.text(node, this.$vm, exp);
  },
  // 是否是v- 开始的指令
  isDirective: function(attrName) {
    return attrName.indexOf('v-') === 0;
  },
  /*
   * 是否是事件指令 事件指令以 v-on开头的
   */
   isEventDirective: function(dir) {
     return dir.indexOf('on') === 0;
   },
   // 是否是元素节点
   isElementNode: function(node) {
     return node.nodeType === 1;
   },
   // 是否是文本节点
   isTextNode: function(node) {
     return node.nodeType === 3;
   }
};

// 指令处理
var compileUtil = {
  text: function(node, vm, exp) {
    this.bind(node, vm, exp, 'text');
  },
  html: function(node, vm, exp) {
    this.bind(node, vm, exp, 'html');
  },
  /*
   * 普通指令 v-model 开头的，调用model方法
   * @param {node} 容器节点
   * @param {vm} 数据对象
   * @param {exp} 普通指令的值 比如 v-model="xx" 那么exp就等于xx
   */
  model: function(node, vm, exp) {
    this.bind(node, vm, exp, 'model');
    var self = this;
    var val = this.getVMVal(vm, exp);
    // 监听input的事件
    node.addEventListener('input', function(e) {
      var newValue = e.target.value;
      // 比较新旧值是否相同
      if (val === newValue) {
        return;
      }
      // 重新设置新值
      self.setVMVal(vm, exp, newValue);
      val = newValue;
    });
  },
  /*
   *  返回 v-mdoel = "xx" 中的xx的值， 比如data对象会定义如下：
    data: {
      "xx" : "111"
    }
    * @param {vm} 数据对象
    * @param {exp} 普通指令的值 比如 v-model="xx" 那么exp就等于xx
   */
  getVMVal: function(vm, exp) {
    var val = vm;
    exp = exp.split('.');
    exp.forEach(function(k) {
      val = val[k];
    });
    return val;
  },
  /*
    设置普通指令的值
    @param {vm} 数据对象
    @param {exp} 普通指令的值 比如 v-model="xx" 那么exp就等于xx
    @param {value} 新值
   */
  setVMVal: function(vm, exp, value) {
    var val = vm;
    exp = exp.split('.');
    exp.forEach(function(key, index) {
      // 如果不是最后一个元素的话，更新值
      /*
       数据对象 data 如下数据
       data: {
        child: {
          someStr: 'World !'
        }
      },
       如果 v-model="child.someStr" 那么 exp = ["child", "someStr"], 遍历该数组，
       val = val["child"]; val 先储存该对象，然后再继续遍历 someStr，会执行else语句，因此val['someStr'] = value, 就会更新到对象的值了。
       */
      if (index < exp.length - 1) {
        val = val[key];
      } else {
        val[key] = value;
      }
    });
  },
  class: function(node, vm, exp) {
    this.bind(node, vm, exp, 'class');
  },
  /* 
   事件处理
   @param {node} 元素节点
   @param {vm} 数据对象
   @param {attrValue} attrValue 属性值
   @param {dir} 事件指令的值 比如 v-on:click="xx" 那么dir就等 on:click
   */
  eventHandler: function(node, vm, attrValue, dir) {
    // 获取事件类型 比如dir=on:click 因此 eventType="click" 
    var eventType = dir.split(':')[1];
    /*
     * 获取事件的函数 比如 v-on:click="clickBtn" 那么就会对应vm里面的clickBtn 函数。
     * 比如 methods: {
        clickBtn: function(e) {
          console.log(11)
        }
      }
     */
    var fn = vm.$options.methods && vm.$options.methods[attrValue];
    if (eventType && fn) {
      // 如果有事件类型和函数的话，就绑定该事件
      node.addEventListener(eventType, fn.bind(vm), false);
    }
  },
  /*
   @param {node} 节点
   @param {vm} 数据对象
   @param {exp} 正则匹配的值
   @param {dir} 字符串类型 比如 'text', 'html' 'model'
   */
  bind: function(node, vm, exp, dir) {
    // 获取updater 对象内的对应的函数
    var updaterFn = updater[dir + 'Updater'];

    // 如有该函数的话就执行该函数 参数node为节点，第二个参数为 指令的值。 比如 v-model = 'xx' 那么返回的就是xx的值
    updaterFn && updaterFn(node, this.getVMVal(vm, exp));

    // 调用订阅者watcher
    new Watcher(vm, exp, function(newValue, oldValue) {
      updaterFn && updaterFn(node, newValue, oldValue);
    });
  }
};

var updater = {
  textUpdater: function(node, value) {
    node.textContent = typeof value === 'undefined' ? '' : value;
  },
  htmlUpdater: function(node, value) {
    node.innerHTML = typeof value === 'undefined' ? '' : value;
  },
  classUpdater: function(node, newValue, oldValue) {
    var className = node.className;
    className = className.replace(oldValue, '').replace(/\s$/, '');
    var space = className && String(newValue) ? ' ' : '';
    node.className = className + space + newValue;
  },
  modelUpdater: function(node, newValue) {
    node.value = typeof newValue === 'undefined' ? '' : newValue;
  }
};