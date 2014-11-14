if(RiverTrail === undefined) {
    var RiverTrail = {};
}
RiverTrail.SupportedInterfaces = {};

RiverTrail.SupportedInterfaces.RiverTrailAdapter = function() {
    var _setArgument = function(k, i, a) {
        return setArgument(k.id, i, a.id);
    };
    var _setScalarArgument = function(k, i, a, isInteger, is64bit) {
        return setScalarArgument(k.id, i, a, isInteger, is64bit);
    };
    var _run = function(k, r, i) {
        return run(k.id, r, i);
    };
    var _getValue = function(b, t) {
        return getValue(b.id, v);
    };
    return {
        name: "RiverTrailExtension",
        initContext: window.initContext,
        is64BitFloatingPointEnabled: window.is64BitFloatingPointEnabled,
        compileKernel: window.compileKernel,
        mapData: window.mapData,
        getBuildLog: window.getBuildLog,
        setArgument: _setArgument,
        setScalarArgument: _setScalarArgument,
        run: _run,
        getValue: _getValue
    };
}

RiverTrail.SupportedInterfaces.WebCLAdapter = function() {
    var context;
    var device;
    var commandQueue;
    var failureMem;
    var failureMemCLBuffer;
    var _initContext = function () {
        context = webcl.createContext();
        device = context.getInfo(WebCL.CONTEXT_DEVICES)[0];
        commandQueue = context.createCommandQueue(device);
        failureMem = new Int32Array(1);
        failureMem[0] = 0;
        failureMemCLBuffer = null;
    };
    var _compileKernel =
        function(kernelSource, kernelName) {
            var program = context.createProgram(kernelSource);
            try {
                program.build ([device], "");
            } catch(e) {
                alert ("Failed to build WebCL program. Error "
                 + program.getBuildInfo (device, 
                   WebCL.PROGRAM_BUILD_STATUS)
                 + ":  " + program.getBuildInfo (device, 
                   WebCL.PROGRAM_BUILD_LOG));
                throw e;
            }
            var kernel;
            try {
                kernel = program.createKernel(kernelName);
            } catch(e) {
                alert("Failed to create kernel: " + e.message);
                throw e;
            }
            try {
                failureMemCLBuffer = _mapData(failureMem, true);
                commandQueue.enqueueWriteBuffer(failureMemCLBuffer, false, 0, 4, failureMem);
            } catch (e) {
                alert("Failed to create buffer for failureMem: " + e.message);
                throw e;
            }
            return kernel;
    };
    var _mapData = function(a, isWriteOnly) {
        var clbuffer;
        var bufferFlags = (isWriteOnly !== undefined) ? WebCL.MEM_WRITE_ONLY :
            WebCL.MEM_READ_WRITE;
        try {
            clbuffer = context.createBuffer(bufferFlags, a.byteLength, a);
        } catch(e) {
            alert("Could not create buffer: " + e.message);
            throw e;
        }
        return clbuffer;
    };
    var DPO_NUM_ARTIFICAL_ARGS = 1;
    var _setArgument = function(k, i, a) {
        var ret;
        try {
            ret = k.setArg(i+DPO_NUM_ARTIFICAL_ARGS, a);
        } catch (e) {
            alert("SetArgument failed: " + e.message + " at index " + (i+DPO_NUM_ARTIFICAL_ARGS).toString());
            throw e;
        }
        return ret;
    };
    var _setScalarArgument = function(k, i, a, isInteger, is64Bit) {
        var template;
        if(isInteger)
            template = Uint32Array;
        else if(!is64Bit)
            template = Float32Array;
        else
            template = Float64Array;
        var ret;
        try {
            ret = k.setArg(i+DPO_NUM_ARTIFICAL_ARGS, new template([a]));
        } catch (e) {
            alert("SetScalarArgument failed: " + e.message + " at index " + (i+DPO_NUM_ARTIFICAL_ARGS).toString());
            throw e;
        }
        return ret;
    };
    var _run = function(k, r, i) {
        try {
            k.setArg(0, failureMemCLBuffer);
        } catch(e) {
            alert("SetArgument for failureMem failed: " + e.message);
            throw e;
        }
        try {
            commandQueue.enqueueNDRangeKernel(k, r, null, i, null);
        } catch (e) {
            alert("kernel run failed: " + e.message);
            throw e;
        }
        // TODO: Read failureMem
    };
    var _getValue = function(b, ta) {
        commandQueue.enqueueReadBuffer(b, false, 0, ta.byteLength, ta);
        commandQueue.finish();
    };
    var _getBuildLog = function () {
        return "BuildLog (WebCL adapter) not implemented yet";
    }
    return {
        name: "WebCL",
        initContext: _initContext,
        is64BitFloatingPointEnabled: true, // TODO: getInfo should tell us this.
        compileKernel: _compileKernel,
        mapData: _mapData,
        setArgument: _setArgument,
        setScalarArgument: _setScalarArgument,
        run: _run,
        getValue: _getValue,
        getBuildLog: _getBuildLog
    };
}

RiverTrail.runtime = (function() {
    if(window.RTExtension !== undefined) {
        return RiverTrail.SupportedInterfaces.RiverTrailAdapter();
    }
    else if(window.webcl !== undefined) {
        return RiverTrail.SupportedInterfaces.WebCLAdapter();
    }
    else {
        throw "No OpenCL adapters found";
        return undefined;
    }
})();


