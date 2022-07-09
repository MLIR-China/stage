import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as os from 'os'
import path from 'path'
function cmakeArgs(): string[] {
  return [
    '-DLLVM_ENABLE_PROJECTS=mlir',
    '-DLLVM_TARGETS_TO_BUILD=host',
    '-DCMAKE_C_COMPILER_LAUNCHER=ccache',
    '-DCMAKE_CXX_COMPILER_LAUNCHER=ccache',
    '-DLLVM_ENABLE_ASSERTIONS=ON',
    '-DCMAKE_BUILD_TYPE=Release',
    '-DLLVM_ENABLE_OCAMLDOC=OFF',
    '-DLLVM_ENABLE_BINDINGS=OFF'
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
    llvmSrc = path.join(llvmSrc, 'llvm')
    await exec.exec(
      'cmake',
      ['-S', llvmSrc, '-B', buildDir, '-G', 'Ninja']
        .concat(cmakeArgs())
        .concat(prefixArgs())
    )
    await exec.exec('cmake', ['--build', buildDir, '-t', 'install'])
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
