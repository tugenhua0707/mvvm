/*
 * @param {vm} 数据对象
 * @param {expOrFn} 属性值 比如 v-model='xx' v-on:click='yy' v-text="tt" 中的 xx, yy, tt 
 * @param {cb}  回调函数
 */
function Watcher(vm, expOrFn, cb) {
  this.vm = vm;
  this.expOrFn = expOrFn;
  this.cb = cb;
  this.depIds = {};

  // expOrFn 是事件函数的话
  if (typeof expOrFn === 'function') {
    this.getter = expOrFn;
  } else {
    this.getter = this.parseGetter(expOrFn);
  }
  // 为了触发属性getter，从而在dep添加自己作为订阅者
  this.value = this.get();
}

Watcher.prototype = {
  update: function() {
    this.run();    // observer 中的属性值发生变化 收到通知
  },
  run: function() {
    var value = this.get();
    var oldValue = this.value;
    // 新旧值不相等的话
    if (value !== oldValue) {
      // 把当前的值赋值给 this.value 更新this.value的值
      this.value = value;
      this.cb.call(this.vm, value, oldValue);  // 执行Compile中绑定的回调 更新视图
    }
  },
  get: function() {
    Dep.target = this; // 将当前订阅者指向自己
    var value = this.getter.call(this.vm, this.vm); // 触发getter，添加自己到属性订阅器中
    Dep.target = null;  // 添加完成后 清空数据
    return value;
  },
  parseGetter: function(exp) {
    var reg = /[^\w.$]/;
    if (reg.test(exp)) {
      return;
    }
    var exps = exp.split('.');
    return function(obj) {
      for(var i = 0, len = exps.length; i < len; i++) {
        if (!obj) {
          return;
        }
        obj = obj[exps[i]];
      }
      return obj;
    }
  }
}

