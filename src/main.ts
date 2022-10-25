import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as os from 'os'
import path from 'path'
function cmakeArgs(): string[] {
  return [
    '-DLLVM_ENABLE_PROJECTS=mlir',
    '-DLLVM_ENABLE_ASSERTIONS=ON',
    '-DLLVM_ENABLE_OCAMLDOC=OFF',
    '-DLLVM_ENABLE_BINDINGS=OFF',
    '-DLLVM_INSTALL_UTILS=ON',
    '-DLLVM_ENABLE_ZLIB=OFF',
    '-DLLVM_ENABLE_ZSTD=OFF',
    '-DLLVM_ENABLE_TERMINFO=OFF'
  ]
}

function prefixArgs(): string[] {
  const homedir = os.homedir()
  return [`-DCMAKE_INSTALL_PREFIX=${homedir}/llvm-install`]
}
async function run(): Promise<void> {
  try {
    const buildDir = 'build'
    let llvmSrc: string = core.getInput('llvm-project-root-dir', {
      required: true
    })
    const nativeLLVMInstallDir = core.getInput('native-llvm-install-dir', {
      required: false
    })
    let userCmakeArgs = core.getMultilineInput('cmake-args', {
      required: false
    })
    if (!userCmakeArgs) {
      userCmakeArgs = []
    }
    let hasBuildType = false
    for (const arg of userCmakeArgs) {
      if (arg.includes('CMAKE_BUILD_TYPE')) {
        hasBuildType = true
        break
      }
    }
    if (!hasBuildType) {
      userCmakeArgs = userCmakeArgs.concat('-DCMAKE_BUILD_TYPE=Release')
    }
    let crossArgs: string[] = []
    if (nativeLLVMInstallDir) {
      crossArgs = [
        `-DLLVM_TABLEGEN=${nativeLLVMInstallDir}/bin/llvm-tblgen`,
        `-DCLANG_TABLEGEN=${nativeLLVMInstallDir}/bin/clang-tblgen`,
        `-DMLIR_TABLEGEN=${nativeLLVMInstallDir}/bin/mlir-tblgen`,
        `-DMLIR_LINALG_ODS_GEN=${nativeLLVMInstallDir}/bin/mlir-linalg-ods-gen`,
        `-DMLIR_LINALG_ODS_YAML_GEN=${nativeLLVMInstallDir}/bin/mlir-linalg-ods-yaml-gen`,
        `-DLLVM_INCLUDE_TESTS=OFF` // Disable tests for cross compilation because PDL exe will fail to be run
      ]
    } else {
      crossArgs = ['-DLLVM_TARGETS_TO_BUILD=host']
    }
    llvmSrc = path.join(llvmSrc, 'llvm')
    await exec.exec(
      'cmake',
      ['-S', llvmSrc, '-B', buildDir, '-G', 'Ninja']
        .concat(cmakeArgs())
        .concat(prefixArgs())
        .concat(crossArgs)
        .concat(userCmakeArgs)
    )
    await exec.exec('cmake', ['--build', buildDir, '-t', 'install'])
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
