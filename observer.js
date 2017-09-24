// 对所有的属性数据进行监听
function Observer(data) {
  this.data = data;
  this.init();
}

Observer.prototype = {
  init: function() {
    var self = this;
    var data = self.data;
    // 遍历data对象
    Object.keys(data).forEach(function(key) {
      self.defineReactive(data, key, data[key]);
    });
  },
  defineReactive: function(data, key, value) {
    var dep = new Dep();
    // 递归遍历子对象
    var childObj = observer(value);

    // 对对象的属性使用Object.defineProperty进行监听
    Object.defineProperty(data, key, {
      enumerable: true,  // 可枚举
      configurable: false, // 不能删除目标属性或不能修改目标属性
      get: function() {
        if (Dep.target) {
          dep.addSub(Dep.target);
        }
        return value;
      },
      set: function(newVal) {
        if (newVal === value) {
          return;
        }
        value = newVal;
        // 如果新值是对象的话，递归该对象 进行监听
        childObj = observer(newVal);
        // 通知订阅者 
        dep.notify();
      }
    });
  }
}

function observer(value) {
  if (!value || typeof value !== 'object') {
    return;
  }
  return new Observer(value);
}

function Dep() {
  this.subs = [];
}

Dep.prototype = {
  addSub: function(sub) {
    this.subs.push(sub);
  },
  removeSub: function(sub) {
    var index = this.subs.indexOf(sub);
    if (index != -1) {
      this.subs.splice(index, 1);
    }
  },
  notify: function() {
    // 遍历所有的订阅者 通知所有的订阅者
    this.subs.forEach(function(sub) {
      sub.update();
    })
  }
};

Dep.target = null;